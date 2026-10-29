"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Plus, Square, X } from "lucide-react";
import { KeyGate } from "@/components/key-gate";
import { RenderableText } from "@/components/markdown";
import { ModelPicker } from "@/components/model-picker";
import { VerbosityPicker } from "@/components/verbosity-picker";
import { withVerbosity, type VerbosityId } from "@/lib/verbosity";
import { PromptTextarea } from "@/components/prompt-textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AGENT_MODES,
  buildTurnMessages,
  buildVerdictMessages,
  parseIdea,
  parseVerdict,
  speakerLabel,
  turnOrder,
  type AgentMode,
  type AgentModeId,
  type Participant,
  type Turn,
} from "@/lib/agents";
import { PAGE_CONTAINER } from "@/lib/layout";
import { streamChatCompletion } from "@/lib/openrouter/client";
import { OpenRouterError } from "@/lib/openrouter/types";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

const MAX_ROUNDS = 8;

export function AgentConversation({ mode }: { mode: AgentModeId }) {
  return (
    <KeyGate>
      <Conversation mode={AGENT_MODES[mode]} />
    </KeyGate>
  );
}

function Conversation({ mode }: { mode: AgentMode }) {
  const apiKey = useAppStore((s) => s.apiKey);
  const favorites = useAppStore((s) => s.favorites);

  const [topic, setTopic] = useState("");
  const [verbosity, setVerbosity] = useState<VerbosityId | null>(null);
  const [rounds, setRounds] = useState(3);
  const [people, setPeople] = useState<Participant[]>(() =>
    mode.roles.map((role, i) => ({ modelId: favorites[i] ?? null, role })),
  );
  const [judgeModel, setJudgeModel] = useState<string | null>(
    favorites[mode.roles.length] ?? favorites[0] ?? null,
  );
  const [turns, setTurns] = useState<Turn[]>([]);
  const [verdictRaw, setVerdictRaw] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);

  // Leaving the page must not leave a conversation billing against the key.
  useEffect(() => () => controller.current?.abort(), []);

  const judged = mode.id === "debate" && judgeModel !== null;
  const canRun = topic.trim() !== "" && people.every((p) => p.modelId);

  function setPerson(index: number, change: Partial<Participant>) {
    setPeople((prev) =>
      prev.map((p, i) => (i === index ? { ...p, ...change } : p)),
    );
  }

  async function run() {
    if (!canRun || !apiKey) return;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setTurns([]);
    setVerdictRaw(null);
    setError(null);
    setRunning(true);

    const transcript: Turn[] = [];
    try {
      for (const speaker of turnOrder(people.length, rounds)) {
        const turn: Turn = { speaker, text: "" };
        setTurns([...transcript, turn]);
        await streamChatCompletion({
          apiKey,
          model: people[speaker].modelId!,
          messages: withVerbosity(
            buildTurnMessages(topic, people, transcript, speaker, mode.format),
            verbosity,
          ),
          signal: abort.signal,
          onDelta: (delta) => {
            turn.text += delta;
            setTurns([...transcript, { ...turn }]);
          },
        });
        transcript.push(turn);
      }
      if (judged) {
        let raw = "";
        setVerdictRaw(raw);
        await streamChatCompletion({
          apiKey,
          model: judgeModel,
          messages: buildVerdictMessages(topic, people, transcript),
          signal: abort.signal,
          onDelta: (delta) => {
            raw += delta;
            setVerdictRaw(raw);
          },
        });
      }
    } catch (e) {
      if (!(e instanceof OpenRouterError && e.kind === "aborted")) {
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setRunning(false);
    }
  }

  const calls = people.length * rounds + (judged ? 1 : 0);
  const fixedCast = mode.minAgents === mode.maxAgents;

  return (
    <main className={`flex-1 space-y-4 py-6 ${PAGE_CONTAINER}`}>
      <div className="space-y-3 rounded-xl border p-4">
        <PromptTextarea
          label="Topic"
          required
          value={topic}
          onChange={setTopic}
          onSubmit={run}
          rows={3}
          placeholder={mode.placeholder}
        />

        <ul className="space-y-2">
          {people.map((person, i) => (
            <li
              key={i}
              className="grid items-center gap-2 sm:grid-cols-[6rem_minmax(0,18rem)_1fr_auto]"
            >
              <span className="text-muted-foreground text-xs">
                Agent {i + 1}
              </span>
              <ModelPicker
                mode="single"
                value={person.modelId}
                onChange={(modelId) => setPerson(i, { modelId })}
                placeholder="Pick a model"
              />
              <Input
                value={person.role}
                onChange={(e) => setPerson(i, { role: e.target.value })}
                placeholder="Role, e.g. Argue against the topic."
                aria-label={`Role of agent ${i + 1}`}
              />
              {!fixedCast && (
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={people.length <= mode.minAgents}
                  onClick={() =>
                    setPeople((prev) => prev.filter((_, j) => j !== i))
                  }
                  aria-label={`Remove agent ${i + 1}`}
                >
                  <X />
                </Button>
              )}
            </li>
          ))}
          {mode.id === "debate" && (
            <li className="grid items-center gap-2 sm:grid-cols-[6rem_minmax(0,18rem)_1fr_auto]">
              <span className="text-primary text-xs">Judge</span>
              <ModelPicker
                mode="single"
                value={judgeModel}
                onChange={setJudgeModel}
                placeholder="No judge"
              />
              <span className="text-muted-foreground text-xs">
                Scores every debater at the end and picks a winner.
              </span>
              {judgeModel && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setJudgeModel(null)}
                  aria-label="Remove the judge"
                >
                  <X />
                </Button>
              )}
            </li>
          )}
        </ul>

        <div className="flex flex-wrap items-end gap-3">
          {!fixedCast && (
            <Button
              variant="outline"
              size="sm"
              disabled={people.length >= mode.maxAgents}
              onClick={() =>
                setPeople((prev) => [
                  ...prev,
                  { modelId: null, role: mode.roles.at(-1) ?? "" },
                ])
              }
            >
              <Plus /> Add agent
            </Button>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="rounds">Rounds</Label>
            <Input
              id="rounds"
              type="number"
              min={1}
              max={MAX_ROUNDS}
              value={rounds}
              onChange={(e) =>
                setRounds(
                  Math.min(
                    MAX_ROUNDS,
                    Math.max(1, Number(e.target.value) || 1),
                  ),
                )
              }
              className="w-24"
            />
          </div>
          <p className="text-muted-foreground pb-2 text-xs">
            {calls} model calls, each with a longer transcript than the last.
          </p>
        </div>

        <VerbosityPicker
          service="agents"
          value={verbosity}
          onChange={setVerbosity}
        />

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button onClick={run} disabled={!canRun || running}>
            <Play /> Start
          </Button>
          {running && (
            <Button
              variant="outline"
              onClick={() => controller.current?.abort()}
            >
              <Square /> Stop
            </Button>
          )}
        </div>
      </div>

      {turns.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
          Give them a topic and let them talk.
        </div>
      ) : mode.id === "brainstorm" ? (
        <IdeaBoard turns={turns} people={people} />
      ) : mode.id === "interview" ? (
        <InterviewLog turns={turns} people={people} />
      ) : (
        <Transcript turns={turns} people={people} />
      )}
      {verdictRaw !== null && (
        <VerdictPanel
          raw={verdictRaw}
          people={people}
          done={!running}
          judgeModel={judgeModel}
        />
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </main>
  );
}

interface ViewProps {
  turns: Turn[];
  people: Participant[];
}

function Transcript({ turns, people }: ViewProps) {
  return (
    <ul className="space-y-3">
      {turns.map((turn, i) => (
        <li key={i} className="rounded-xl border p-3">
          <div className="text-muted-foreground mb-1 flex gap-2 text-xs">
            <span className="text-foreground font-medium">
              {speakerLabel(people, turn.speaker)}
            </span>
            <span className="truncate font-mono">
              {people[turn.speaker]?.modelId}
            </span>
          </div>
          <RenderableText text={turn.text} placeholder="…" />
        </li>
      ))}
    </ul>
  );
}

/** Each turn is one idea, so they read as cards on a board. */
function IdeaBoard({ turns, people }: ViewProps) {
  return (
    <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {turns.map((turn, i) => {
        const idea = parseIdea(turn.text);
        return (
          <li key={i} className="flex flex-col border p-3">
            <div className="flex items-baseline gap-2">
              <span className="text-primary text-xs">
                #{String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="text-sm font-semibold">{idea.title || "…"}</h3>
            </div>
            <div className="text-muted-foreground mt-2 flex-1 text-[13px]">
              <RenderableText text={idea.body} placeholder="" />
            </div>
            <div className="text-muted-foreground/70 mt-3 truncate border-t pt-2 text-[11px]">
              {speakerLabel(people, turn.speaker)} ·{" "}
              {people[turn.speaker]?.modelId}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Questions as headings and answers under them, like a printed interview. */
function InterviewLog({ turns, people }: ViewProps) {
  return (
    <ol className="space-y-4">
      {turns.map((turn, i) =>
        turn.speaker === 0 ? (
          <li key={i} className="flex gap-3 text-sm font-semibold">
            <span className="text-primary">Q</span>
            <RenderableText text={turn.text} placeholder="…" />
          </li>
        ) : (
          <li key={i} className="flex gap-3 border-l pl-3 text-sm">
            <span className="text-emerald-400">A</span>
            <div className="min-w-0">
              <RenderableText text={turn.text} placeholder="…" />
              <div className="text-muted-foreground/70 mt-1 text-[11px]">
                {people[turn.speaker]?.modelId}
              </div>
            </div>
          </li>
        ),
      )}
    </ol>
  );
}

function VerdictPanel({
  raw,
  people,
  done,
  judgeModel,
}: {
  raw: string;
  people: Participant[];
  done: boolean;
  judgeModel: string | null;
}) {
  const verdict = done ? parseVerdict(raw, people.length) : null;

  return (
    <section className="border-primary border p-4">
      <h2 className="text-primary text-[11px] tracking-widest uppercase">
        verdict
        <span className="text-muted-foreground ml-2 normal-case">
          {judgeModel}
        </span>
      </h2>
      {!done ? (
        <p className="text-muted-foreground mt-2 text-sm">
          judging<span className="cursor-blink">▊</span>
        </p>
      ) : !verdict ? (
        <div className="mt-2 text-sm">
          <p className="text-muted-foreground mb-2 text-xs">
            The judge did not return a readable score, so here is what it said.
          </p>
          <RenderableText text={raw} placeholder="…" />
        </div>
      ) : (
        <>
          <ul className="mt-3 space-y-2">
            {verdict.scores.map((entry, i) => (
              <li
                key={i}
                className="grid grid-cols-[minmax(0,14rem)_10ch_1fr] items-baseline gap-3 text-[13px]"
              >
                <span
                  className={cn(
                    "truncate",
                    i === verdict.winner && "text-primary font-semibold",
                  )}
                >
                  {i === verdict.winner ? "★ " : ""}
                  {speakerLabel(people, i)}
                </span>
                <span aria-label={`${entry.score} out of 10`}>
                  <span className="text-primary">
                    {"█".repeat(entry.score)}
                  </span>
                  <span className="text-muted-foreground/40">
                    {"░".repeat(10 - entry.score)}
                  </span>
                </span>
                <span className="text-muted-foreground">
                  <span className="text-foreground mr-2">{entry.score}/10</span>
                  {entry.reason}
                </span>
              </li>
            ))}
          </ul>
          {verdict.summary && (
            <p className="mt-3 border-t pt-3 text-sm">
              <span className="text-primary">winner:</span>{" "}
              {speakerLabel(people, verdict.winner)}. {verdict.summary}
            </p>
          )}
        </>
      )}
    </section>
  );
}
