/**
 * A conversation between models: they take turns in a fixed order, and each
 * one sees the topic and the whole transcript so far, so the reply it writes
 * answers what the others actually said.
 */
import type { ChatMessage } from "./openrouter/types";

export interface Participant {
  modelId: string | null;
  role: string;
}

export interface Turn {
  /** Index into the participants list. */
  speaker: number;
  text: string;
}

export type AgentModeId = "debate" | "brainstorm" | "interview";

export interface AgentMode {
  id: AgentModeId;
  roles: readonly string[];
  minAgents: number;
  maxAgents: number;
  /** Extra output rule for every turn, when the view needs a shape. */
  format?: string;
  placeholder: string;
}

export const AGENT_MODES: Record<AgentModeId, AgentMode> = {
  debate: {
    id: "debate",
    roles: [
      "Pro. Argue strongly in favour of the topic.",
      "Con. Argue strongly against the topic and rebut the previous message.",
    ],
    minAgents: 2,
    maxAgents: 4,
    placeholder: "Motion to debate, e.g. Remote work beats the office.",
  },
  brainstorm: {
    id: "brainstorm",
    roles: [
      "Builder. Take the latest idea and expand it with one concrete new angle.",
      "Builder. Take the latest idea and expand it with one concrete new angle.",
      "Skeptic. Point out the weakest part of the latest idea and fix it.",
    ],
    minAgents: 2,
    maxAgents: 4,
    format:
      "Start with a title of at most eight words on its own line, then describe the idea.",
    placeholder: "What should they brainstorm? e.g. Names for a coffee shop.",
  },
  interview: {
    id: "interview",
    roles: [
      "Interviewer. Ask one probing follow-up question.",
      "Expert. Answer the latest question directly and concretely.",
    ],
    minAgents: 2,
    maxAgents: 2,
    placeholder: "Subject of the interview, e.g. Running Postgres at scale.",
  },
};

/** Round-robin speaker indices: every participant speaks once per round. */
export function turnOrder(participants: number, rounds: number): number[] {
  return Array.from(
    { length: participants * rounds },
    (_, i) => i % participants,
  );
}

/** Roles may repeat, so the number keeps speakers apart in the transcript. */
export function speakerLabel(participants: Participant[], index: number) {
  const role = participants[index].role.trim().split(/[.:]/)[0].slice(0, 30);
  return `Agent ${index + 1}${role ? ` (${role})` : ""}`;
}

function transcriptText(participants: Participant[], transcript: Turn[]) {
  return transcript
    .map((turn) => `${speakerLabel(participants, turn.speaker)}: ${turn.text}`)
    .join("\n\n");
}

export function buildTurnMessages(
  topic: string,
  participants: Participant[],
  transcript: Turn[],
  speaker: number,
  format?: string,
): ChatMessage[] {
  return [
    {
      role: "system",
      content: `You are ${speakerLabel(participants, speaker)} in a conversation between AI agents. Your role: ${participants[speaker].role.trim() || "take part naturally."}
Reply with your next message only, under 150 words, without a speaker label.${format ? `\n${format}` : ""}`,
    },
    {
      role: "user",
      content: `Topic: ${topic.trim()}

Conversation so far:
${transcriptText(participants, transcript) || "(nothing yet, you speak first)"}

Write your next message.`,
    },
  ];
}

export interface Verdict {
  /** One per debater, in participant order. 0 to 10. */
  scores: { score: number; reason: string }[];
  /** Index into the participants list. */
  winner: number;
  summary: string;
}

export function buildVerdictMessages(
  topic: string,
  participants: Participant[],
  transcript: Turn[],
): ChatMessage[] {
  const debaters = participants
    .map((_, i) => `- ${speakerLabel(participants, i)}`)
    .join("\n");
  return [
    {
      role: "system",
      content:
        "You are an impartial debate judge. You score arguments, not positions you agree with.",
    },
    {
      role: "user",
      content: `Motion: ${topic.trim()}

Debaters:
${debaters}

Debate:
${transcriptText(participants, transcript)}

Score each debater from 0 to 10 on the strength of their arguments and rebuttals, then pick one winner.

Reply with one JSON object and nothing else, no prose and no code fence:
{"scores": [{"agent": <number>, "score": <integer 0-10>, "reason": "<one sentence>"}], "winner": <agent number>, "summary": "<why they won, at most two sentences>"}`,
    },
  ];
}

/**
 * Takes the widest brace-delimited span, since models wrap JSON in fences
 * and commentary anyway. Null unless every debater got a score and the
 * winner is one of them.
 */
export function parseVerdict(raw: string, debaters: number): Verdict | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  let record: Record<string, unknown>;
  try {
    record = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!Array.isArray(record?.scores)) return null;
  const scores: Verdict["scores"] = [];
  for (const entry of record.scores) {
    const agent = Number(entry?.agent) - 1;
    const score = Number(entry?.score);
    if (!(agent >= 0 && agent < debaters) || !Number.isFinite(score)) continue;
    scores[agent] = {
      score: Math.round(Math.min(10, Math.max(0, score))),
      reason: typeof entry.reason === "string" ? entry.reason : "",
    };
  }
  const winner = Number(record.winner) - 1;
  if (scores.filter(Boolean).length !== debaters || !scores[winner]) {
    return null;
  }
  return {
    scores,
    winner,
    summary: typeof record.summary === "string" ? record.summary : "",
  };
}

/** A brainstorm turn as a card: the first line is the title. */
export function parseIdea(text: string): { title: string; body: string } {
  const [first = "", ...rest] = text.trim().split("\n");
  const title = first
    .replace(/^#+\s*/, "")
    .replace(/^title:\s*/i, "")
    .replace(/\*\*/g, "")
    .replace(/:$/, "")
    .trim();
  return { title, body: rest.join("\n").trim() };
}
