import { describe, expect, it } from "vitest";
import {
  buildTurnMessages,
  parseIdea,
  parseVerdict,
  turnOrder,
  type Participant,
} from "./agents";

const people: Participant[] = [
  { modelId: "a/x", role: "Pro. Argue for." },
  { modelId: "b/y", role: "Con. Argue against." },
];

describe("turnOrder", () => {
  it("lets everyone speak once per round, in order", () => {
    expect(turnOrder(2, 2)).toEqual([0, 1, 0, 1]);
  });
});

describe("buildTurnMessages", () => {
  it("tells the first speaker nothing was said yet", () => {
    const [, user] = buildTurnMessages("Tabs or spaces", people, [], 0);
    expect(user.content).toContain("you speak first");
  });

  it("shows the next speaker what the first one said", () => {
    const [system, user] = buildTurnMessages(
      "Tabs or spaces",
      people,
      [{ speaker: 0, text: "Tabs, obviously." }],
      1,
    );
    expect(system.content).toContain("Agent 2 (Con)");
    expect(user.content).toContain("Agent 1 (Pro): Tabs, obviously.");
  });

  it("adds the mode's format rule", () => {
    const [system] = buildTurnMessages(
      "x",
      people,
      [],
      0,
      "Start with a title.",
    );
    expect(system.content).toContain("Start with a title.");
  });
});

describe("parseVerdict", () => {
  const raw = `Here you go:
\`\`\`json
{"scores": [{"agent": 1, "score": 7, "reason": "Solid."}, {"agent": 2, "score": 12, "reason": "Sharp."}], "winner": 2, "summary": "Better rebuttals."}
\`\`\``;

  it("reads a fenced verdict, clamps scores and maps agents to indices", () => {
    expect(parseVerdict(raw, 2)).toEqual({
      scores: [
        { score: 7, reason: "Solid." },
        { score: 10, reason: "Sharp." },
      ],
      winner: 1,
      summary: "Better rebuttals.",
    });
  });

  it("rejects a verdict that skips a debater or names an outsider", () => {
    expect(parseVerdict(raw, 3)).toBeNull();
    expect(
      parseVerdict(raw.replace('"winner": 2', '"winner": 5'), 2),
    ).toBeNull();
    expect(parseVerdict("no json", 2)).toBeNull();
  });
});

describe("parseIdea", () => {
  it("splits a markdown title from the body", () => {
    expect(parseIdea("## **Bean There:**\nA pun.\nSecond line.")).toEqual({
      title: "Bean There",
      body: "A pun.\nSecond line.",
    });
  });
});
