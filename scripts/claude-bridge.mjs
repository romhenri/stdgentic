// Local-only bridge: serves an OpenRouter-shaped /models and streaming
// /chat/completions on 127.0.0.1, answered by the local `claude` CLI so runs
// spend the Claude Code plan instead of OpenRouter credits.
// Run with `pnpm claude-bridge` next to `pnpm dev` (or the desktop app).
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { createInterface } from "node:readline";
import { Readable } from "node:stream";

const PORT = Number(process.env.CLAUDE_BRIDGE_PORT ?? 4141);
// The NotFrontier gateway (`nf_` keys) sends no CORS headers, so the browser
// reaches it through /gateway/* here.
const GATEWAY =
  process.env.NF_GATEWAY_URL ??
  "http://2tkjbcjg1tgbjsrhizekrzw0.188.245.52.55.sslip.io";
// Any page in the browser could hit a localhost port, so only the app's own
// origins get CORS; everything else is refused before claude is spawned.
const ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "tauri://localhost",
  "http://tauri.localhost",
]);

const MODELS = [
  ["haiku", "Haiku"],
  ["sonnet", "Sonnet"],
  ["opus", "Opus"],
].map(([alias, label]) => ({
  id: `claude-code/${alias}`,
  name: `Claude Code: ${label} (local plan)`,
  description: "Runs through the local Claude Code CLI on your plan.",
  context_length: 200000,
  pricing: { prompt: "0", completion: "0" },
}));

const text = (content) =>
  typeof content === "string"
    ? content
    : content
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("\n");

/** `claude -p` takes one prompt, so a multi-turn chat becomes a transcript. */
function toPrompt(messages) {
  const turns = messages.filter((m) => m.role !== "system");
  if (turns.length === 1) return text(turns[0].content);
  // ponytail: transcript-in-one-prompt, switch to the Agent SDK if real turns matter.
  return turns
    .map(
      (m) => `${m.role === "user" ? "User" : "Assistant"}: ${text(m.content)}`,
    )
    .join("\n\n");
}

const sse = (res, payload) =>
  res.write(
    `data: ${typeof payload === "string" ? payload : JSON.stringify(payload)}\n\n`,
  );

function chat(body, res) {
  const system = body.messages
    .filter((m) => m.role === "system")
    .map((m) => text(m.content))
    .join("\n\n");
  const args = [
    "-p",
    "--model",
    body.model.replace(/^claude-code\//, ""),
    "--output-format",
    "stream-json",
    "--include-partial-messages",
    "--verbose",
    "--tools",
    "",
    "--safe-mode",
    "--no-session-persistence",
    "--system-prompt",
    system || "You are a helpful assistant.",
  ];
  // Temperature and max_tokens have no CLI flag; they are dropped.
  const child = spawn("claude", args, {
    cwd: tmpdir(),
    stdio: ["pipe", "pipe", "pipe"],
  });
  let stderr = "";
  let failed = false;
  child.stderr.on("data", (chunk) => (stderr += chunk));
  child.stdin.end(toPrompt(body.messages));
  res.on("close", () => child.kill());

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
  });

  createInterface({ input: child.stdout }).on("line", (line) => {
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      return;
    }
    const delta = msg.type === "stream_event" && msg.event?.delta;
    if (delta?.type === "text_delta") {
      sse(res, { choices: [{ delta: { content: delta.text } }] });
    } else if (msg.type === "result") {
      if (msg.is_error) {
        failed = true;
        sse(res, {
          error: { message: String(msg.result ?? "Claude Code failed.") },
        });
        return;
      }
      const u = msg.usage ?? {};
      const prompt =
        (u.input_tokens ?? 0) +
        (u.cache_creation_input_tokens ?? 0) +
        (u.cache_read_input_tokens ?? 0);
      // No `cost`: plan usage is not OpenRouter spend.
      sse(res, {
        usage: {
          prompt_tokens: prompt,
          completion_tokens: u.output_tokens ?? 0,
        },
      });
    }
  });

  child.on("error", (error) => {
    failed = true;
    sse(res, { error: { message: `Could not run claude: ${error.message}` } });
    res.end();
  });
  child.on("close", (code) => {
    if (res.writableEnded) return;
    if (code !== 0 && !failed) {
      sse(res, {
        error: { message: stderr.trim() || `claude exited with ${code}` },
      });
    }
    sse(res, "[DONE]");
    res.end();
  });
}

/** Pipes /gateway/<path> to the gateway's /v1/<path>, stream and all. */
async function forward(req, res) {
  try {
    const upstream = await fetch(
      `${GATEWAY}/v1${req.url.slice("/gateway".length)}`,
      {
        method: req.method,
        headers: {
          Authorization: req.headers.authorization ?? "",
          "Content-Type": "application/json",
        },
        body: req.method === "POST" ? Readable.toWeb(req) : undefined,
        duplex: "half",
      },
    );
    res.writeHead(upstream.status, {
      "Content-Type":
        upstream.headers.get("content-type") ?? "application/json",
    });
    if (!upstream.body) return res.end();
    const body = Readable.fromWeb(upstream.body);
    res.on("close", () => body.destroy());
    body.pipe(res);
  } catch (error) {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({ error: { message: `Gateway: ${error.message}` } }),
    );
  }
}

createServer((req, res) => {
  const origin = req.headers.origin;
  if (origin && !ORIGINS.has(origin)) {
    res.writeHead(403).end();
    return;
  }
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Vary", "Origin");
  }
  if (req.method === "OPTIONS") return res.writeHead(204).end();
  if (req.url.startsWith("/gateway/")) return forward(req, res);
  if (req.method === "GET" && req.url === "/models") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ data: MODELS }));
  }
  if (req.method === "POST" && req.url === "/chat/completions") {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      try {
        chat(JSON.parse(raw), res);
      } catch {
        res.writeHead(400).end();
      }
    });
    return;
  }
  res.writeHead(404).end();
}).listen(PORT, "127.0.0.1", () => {
  console.log(`claude bridge on http://127.0.0.1:${PORT}`);
});
