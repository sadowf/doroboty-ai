import { describe, expect, it } from "vitest";
import { initialState, transition, stateSchema, type State } from "./model";
const time = "2026-11-03T10:00:00.000Z";
function as(state: State, id: string) {
  return transition(state, { type: "select_person", id });
}
function submitted() {
  const s = as(initialState(), "candidate-anna");
  return transition(
    s,
    {
      type: "submit",
      jobId: s.jobs[0].id,
      notes: "Original notes",
      generated: "Generated copy",
      answer: "Approved application with sufficient context.",
      consent: true,
    },
    time,
    "application-anna",
  );
}
describe("coherent browser scenario", () => {
  it("requires approval and prevents duplicate applications", () => {
    const s = as(initialState(), "candidate-anna");
    const input = {
      type: "submit" as const,
      jobId: s.jobs[0].id,
      notes: "",
      generated: "",
      answer: "Approved application with sufficient context.",
      consent: false,
    };
    expect(() => transition(s, input, time)).toThrow("Zatwierdź");
    expect(() => transition(submitted(), { ...input, consent: true }, time)).toThrow("już wysłana");
    expect(s.applications).toHaveLength(1);
  });
  it("preserves approved sources while profile and notes evolve", () => {
    const s = submitted();
    const app = s.applications.at(-1)!;
    const changed = transition(s, {
      type: "profile",
      value: {
        name: "Updated Name",
        headline: "Updated Headline",
        bio: "Changed",
        location: "Wrocław",
      },
    });
    expect(changed.applications.at(-1)).toEqual(app);
    expect(app.candidateName).toBe("Anna Kowalska");
    expect(app.sourceNotes).toBe("Original notes");
    expect(app.generatedAnswer).toBe("Generated copy");
  });
  it("supports employer review through conversation and continuation without skipping stages", () => {
    let s = as(submitted(), "employer-brightlabs");
    expect(() =>
      transition(
        s,
        { type: "stage", applicationId: "application-anna", stage: "continued", note: "" },
        time,
      ),
    ).toThrow();
    for (const stage of [
      "reviewed",
      "interview_invited",
      "first_conversation_held",
      "continued",
      "hired",
    ] as const)
      s = transition(
        s,
        { type: "stage", applicationId: "application-anna", stage, note: "Employer note" },
        time,
      );
    expect(s.applications.at(-1)?.stage).toBe("hired");
    expect(s.applications.at(-1)?.events).toHaveLength(6);
  });
  it("rejects another employer’s stage writes and another candidate’s withdrawal", () => {
    expect(() =>
      transition(
        as(submitted(), "employer-northstar"),
        { type: "stage", applicationId: "application-anna", stage: "reviewed", note: "" },
        time,
      ),
    ).toThrow();
    expect(() =>
      transition(
        as(submitted(), "candidate-marek"),
        { type: "withdraw", applicationId: "application-anna" },
        time,
      ),
    ).toThrow();
  });
  it("makes withdrawal terminal and keeps drafts and saved jobs person-specific", () => {
    let s = submitted();
    s = transition(s, { type: "withdraw", applicationId: "application-anna" }, time);
    expect(() =>
      transition(
        as(s, "employer-brightlabs"),
        { type: "stage", applicationId: "application-anna", stage: "reviewed", note: "" },
        time,
      ),
    ).toThrow();
    s = transition(s, {
      type: "draft",
      jobId: s.jobs[1].id,
      notes: "Notes",
      generated: "Output",
      answer: "Edited",
    });
    s = transition(s, { type: "toggle_saved", jobId: s.jobs[1].id });
    expect(s.drafts[0].candidateId).toBe("candidate-anna");
    expect(s.saved[0].candidateId).toBe("candidate-anna");
  });
  it("validates broken references, duplicate submissions and invalid histories on import", () => {
    const s = submitted();
    s.applications.push({ ...s.applications.at(-1)!, id: "another-id" });
    expect(stateSchema.safeParse(s).success).toBe(false);
    const broken = submitted();
    broken.applications.at(-1)!.events.push({ stage: "hired", at: time, note: "" });
    broken.applications.at(-1)!.stage = "hired";
    expect(stateSchema.safeParse(broken).success).toBe(false);
    const unknown = initialState();
    unknown.jobs[0].companyId = "missing";
    expect(stateSchema.safeParse(unknown).success).toBe(false);
  });
  it("only publishes own-company jobs and keeps submitted job snapshots unchanged", () => {
    const state = as(submitted(), "employer-brightlabs");
    const updated = { ...state.jobs[0], title: "Updated public role" };
    const result = transition(state, { type: "publish", job: updated });
    expect(result.jobs[0].title).toBe("Updated public role");
    expect(result.applications.at(-1)?.jobTitle).toBe("AI Product Manager");
    expect(() =>
      transition(as(state, "employer-northstar"), { type: "publish", job: updated }),
    ).toThrow();
    expect(() =>
      transition(state, { type: "publish", job: { ...updated, salaryMin: 500, salaryMax: 1 } }),
    ).toThrow();
  });
});

describe("contribution card (P1A)", () => {
  const answers = (kind: "text" | "dont_know" = "text") =>
    (["q1", "q2", "q3", "q4", "q5"] as const).map((id) => ({
      id,
      kind: id === "q4" ? kind : ("text" as const),
      text: `Konkretna odpowiedź ${id}`,
    }));
  function withMode(mode: "none" | "optional" | "required") {
    const employer = as(initialState(), "employer-brightlabs");
    const published = transition(employer, {
      type: "publish",
      job: { ...employer.jobs[0], contributionCard: mode },
    });
    return as(published, "candidate-anna");
  }
  const submit = (s: State, contributionCard?: ReturnType<typeof answers>) =>
    transition(
      s,
      {
        type: "submit",
        jobId: s.jobs[0].id,
        notes: "",
        generated: "",
        answer: "Approved application with sufficient context.",
        consent: true,
        contributionCard,
      },
      time,
      "application-anna",
    );

  it("defaults fixtures and older jobs to no card and stores no card for them", () => {
    expect(initialState().jobs.every((job) => job.contributionCard === "none")).toBe(true);
    const s = submit(withMode("none"), answers());
    expect(s.applications.at(-1)?.contributionCard).toBeUndefined();
  });
  it("enforces a required card in the domain, accepting 'Nie wiem'", () => {
    const s = withMode("required");
    expect(() => submit(s)).toThrow("Karta wkładu jest obowiązkowa");
    expect(() => submit(s, answers().slice(0, 4))).toThrow("1 z 5");
    const card = submit(s, answers("dont_know")).applications.at(-1)?.contributionCard;
    expect(card).toMatchObject({ mode: "required", category: "lead" });
    expect(card?.answers[3]).toMatchObject({ kind: "dont_know", text: "" });
  });
  it("lets the candidate skip an optional card", () => {
    const card = submit(withMode("optional")).applications.at(-1)?.contributionCard;
    expect(card?.answers.every((a) => a.kind === "empty")).toBe(true);
  });
  it("rejects 'Nie mierzyliśmy' on a question that does not allow it", () => {
    const wrong = answers().map((a) =>
      a.id === "q1" ? { ...a, kind: "not_measured" as never } : a,
    );
    expect(() => submit(withMode("optional"), wrong)).toThrow("nie pasują");
  });
  it("keeps the submitted card unchanged after the job mode or category changes", () => {
    const s = submit(withMode("required"), answers());
    const before = s.applications.at(-1)!;
    const employer = as(s, "employer-brightlabs");
    const changed = transition(employer, {
      type: "publish",
      job: { ...employer.jobs[0], contributionCard: "none", category: "build" },
    });
    expect(changed.applications.at(-1)).toEqual(before);
    expect(before.contributionCard?.answers[0].question).toContain("inicjatywę");
  });
  it("saves card answers in the draft and removes the draft on submission", () => {
    let s = withMode("required");
    s = transition(s, {
      type: "draft",
      jobId: s.jobs[0].id,
      notes: "",
      generated: "",
      answer: "Draft",
      contributionCard: [{ id: "q2", kind: "dont_know", text: "Zachowany tekst" }],
    });
    expect(s.drafts.at(-1)?.contributionCard).toEqual([
      { id: "q2", kind: "dont_know", text: "Zachowany tekst" },
    ]);
    expect(submit(s, answers()).drafts).toHaveLength(0);
  });
  it("parses an older saved state without any card fields", () => {
    const old = JSON.parse(JSON.stringify(submit(withMode("required"), answers())));
    for (const job of old.jobs) delete job.contributionCard;
    for (const application of old.applications) delete application.contributionCard;
    const parsed = stateSchema.parse(old);
    expect(parsed.jobs.every((job) => job.contributionCard === "none")).toBe(true);
    expect(parsed.applications.every((a) => a.contributionCard === undefined)).toBe(true);
  });
});
