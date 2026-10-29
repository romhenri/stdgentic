import { afterEach, describe, expect, it, vi } from "vitest";
import { onCharged, streamChatCompletion } from "./client";

function sseResponse(frames: string[]): Response {
  const body = frames.map((frame) => `data: ${frame}\n\n`).join("");
  return new Response(new TextEncoder().encode(body), { status: 200 });
}

afterEach(() => {
  onCharged(null);
  vi.unstubAllGlobals();
});

describe("onCharged", () => {
  it("reports the cost OpenRouter puts in the final usage frame", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        sseResponse([
          JSON.stringify({ choices: [{ delta: { content: "hi" } }] }),
          JSON.stringify({
            usage: { prompt_tokens: 3, completion_tokens: 1, cost: 0.0004 },
          }),
          "[DONE]",
        ]),
      ),
    );
    const charged: number[] = [];
    onCharged((usd) => charged.push(usd));

    await streamChatCompletion({
      apiKey: "test",
      model: "test/model",
      messages: [{ role: "user", content: "hi" }],
      onDelta: () => {},
    });

    expect(charged).toEqual([0.0004]);
  });
});
