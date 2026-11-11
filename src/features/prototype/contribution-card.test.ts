import { describe, expect, it } from "vitest";
import { jobCategories } from "@/features/jobs/types";
import {
  buildContributionSnapshot,
  contributionCardDraft,
  contributionCardInputSchema,
  contributionCardStatus,
  contributionQuestionIds,
  contributionQuestions,
  MAX_CONTRIBUTION_ANSWER_LENGTH,
  recruiterGuide,
  type ContributionAnswerInput,
} from "./contribution-card";

const full = (overrides: Partial<Record<string, ContributionAnswerInput>> = {}) =>
  contributionQuestionIds.map(
    (id) => overrides[id] ?? { id, kind: "text" as const, text: `Odpowiedź ${id}` },
  );

describe("contribution card configuration", () => {
  it("defines five fixed questions per role with the allowed no-description options", () => {
    for (const category of jobCategories) {
      const questions = contributionQuestions[category];
      expect(questions.map((q) => q.id)).toEqual([...contributionQuestionIds]);
      for (const q of questions) {
        expect(q.options).toContain("dont_know");
        expect(q.options.includes("not_measured")).toBe(q.id === "q3" || q.id === "q5");
      }
      expect(recruiterGuide.examples[category].concrete.length).toBeGreaterThan(0);
      expect(recruiterGuide.examples[category].generic.length).toBeGreaterThan(0);
    }
  });
  it("keeps candidate-facing questions gender-neutral", () => {
    const gendered = /(łeś|łaś|\(a\)|zrobiłe|zbudowałe|wdrożyłe|prowadziłe)/i;
    for (const category of jobCategories)
      for (const q of contributionQuestions[category]) expect(q.text).not.toMatch(gendered);
  });
});

describe("contribution card validation", () => {
  it("stores no card when the job has none", () => {
    expect(buildContributionSnapshot("build", "none", full())).toBeUndefined();
  });
  it("accepts 'Nie wiem' and 'Nie mierzyliśmy' as complete answers for a required card", () => {
    const snapshot = buildContributionSnapshot(
      "apply",
      "required",
      full({
        q1: { id: "q1", kind: "dont_know", text: "Typed text is kept only in the draft" },
        q3: { id: "q3", kind: "not_measured", text: "" },
      }),
    )!;
    expect(contributionCardStatus(snapshot)).toBe("complete");
    expect(snapshot.answers[0]).toMatchObject({ kind: "dont_know", text: "" });
    expect(snapshot.answers[2]).toMatchObject({ kind: "not_measured" });
    expect(snapshot.answers[1].question).toBe(contributionQuestions.apply[1].text);
  });
  it("blocks a required card with gaps and reports how many answers are missing", () => {
    const answers = full({
      q2: { id: "q2", kind: "text", text: "   " },
      q5: { id: "q5", kind: "text", text: "" },
    });
    expect(() => buildContributionSnapshot("lead", "required", answers)).toThrow(
      "Brakuje odpowiedzi na 2 z 5 pytań",
    );
    expect(() => buildContributionSnapshot("lead", "required", [])).toThrow("5 z 5");
  });
  it("allows an optional card to be skipped or partially filled", () => {
    expect(contributionCardStatus(buildContributionSnapshot("build", "optional", []))).toBe(
      "skipped",
    );
    expect(
      contributionCardStatus(
        buildContributionSnapshot("build", "optional", [{ id: "q1", kind: "text", text: "Tak" }]),
      ),
    ).toBe("partial");
    expect(contributionCardStatus(undefined)).toBe("none");
  });
  it("rejects answers that do not match the role's questions", () => {
    expect(() =>
      buildContributionSnapshot("build", "optional", [
        { id: "q1", kind: "not_measured", text: "" },
      ]),
    ).toThrow("nie pasują");
    expect(() =>
      buildContributionSnapshot("build", "optional", [{ id: "q9", kind: "text", text: "x" }]),
    ).toThrow("nie pasują");
    expect(() =>
      buildContributionSnapshot("build", "optional", [
        { id: "q1", kind: "text", text: "a" },
        { id: "q1", kind: "text", text: "b" },
      ]),
    ).toThrow("nie pasują");
  });
  it("limits each answer to 2,000 characters without any minimum length", () => {
    const long = "x".repeat(MAX_CONTRIBUTION_ANSWER_LENGTH);
    expect(
      buildContributionSnapshot(
        "build",
        "required",
        full({ q1: { id: "q1", kind: "text", text: long } }),
      )?.answers[0].text,
    ).toBe(long);
    expect(
      contributionCardInputSchema.safeParse([{ id: "q1", kind: "text", text: `${long}x` }]).success,
    ).toBe(false);
    expect(
      buildContributionSnapshot(
        "build",
        "required",
        full({ q1: { id: "q1", kind: "text", text: "a" } }),
      ),
    ).toBeDefined();
  });
  it("restores a draft for the current role and drops options the role does not allow", () => {
    expect(contributionCardDraft("build", undefined)).toHaveLength(5);
    const restored = contributionCardDraft("build", [
      { id: "q2", kind: "dont_know", text: "kept" },
      { id: "q3", kind: "not_measured", text: "" },
    ]);
    expect(restored[1]).toEqual({ id: "q2", kind: "dont_know", text: "kept" });
    expect(restored[2].kind).toBe("not_measured");
    expect(
      contributionCardDraft("apply", [{ id: "q1", kind: "not_measured", text: "x" }])[0],
    ).toEqual({ id: "q1", kind: "text", text: "x" });
  });
});
