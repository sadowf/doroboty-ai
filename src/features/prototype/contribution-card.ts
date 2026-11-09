import { z } from "zod";
import { jobCategories, type JobCategory } from "@/features/jobs/types";

/**
 * Contribution card (prototype P1A).
 *
 * Single source for question wording, the static recruiter guide and the Zod schemas shared by
 * the application form and `transition()`. Question wording is still being validated with
 * recruiters: change texts here only. Submitted applications keep a copy of the question text,
 * so editing this file never rewrites history.
 *
 * The card collects the candidate's own words. It does not verify skills or truthfulness and is
 * never scored automatically.
 */

export const contributionCardModes = ["none", "optional", "required"] as const;
export type ContributionCardMode = (typeof contributionCardModes)[number];

export const contributionCardModeLabels: Record<ContributionCardMode, string> = {
  none: "Bez karty",
  optional: "Karta opcjonalna",
  required: "Karta obowiązkowa",
};

export const contributionCardModeDescriptions: Record<ContributionCardMode, string> = {
  none: "Formularz aplikacji bez dodatkowych pytań.",
  optional: "Kandydat zobaczy 5 pytań i sam zdecyduje, czy na nie odpowie.",
  required: "Kandydat nie wyśle aplikacji bez odpowiedzi na 5 pytań; „Nie wiem” jest dozwolone.",
};

export const contributionQuestionIds = ["q1", "q2", "q3", "q4", "q5"] as const;
export type ContributionQuestionId = (typeof contributionQuestionIds)[number];

/** Answers that replace a written description. */
export const contributionOptionKinds = ["dont_know", "not_measured"] as const;
export type ContributionOptionKind = (typeof contributionOptionKinds)[number];

export const contributionOptionLabels: Record<ContributionOptionKind, string> = {
  dont_know: "Nie wiem",
  not_measured: "Nie mierzyliśmy",
};

export type ContributionQuestion = {
  id: ContributionQuestionId;
  text: string;
  options: readonly ContributionOptionKind[];
};

const knowOnly = ["dont_know"] as const;
const knowOrMeasured = ["dont_know", "not_measured"] as const;

/** Gender-neutral wording approved on 2026-11-09. Do not reintroduce gendered forms. */
export const contributionQuestions: Record<JobCategory, readonly ContributionQuestion[]> = {
  apply: [
    {
      id: "q1",
      text: "Opisz jeden projekt wdrożony przez Ciebie w pracy: do czego służył i kto z niego korzystał.",
      options: knowOnly,
    },
    {
      id: "q2",
      text: "Co było Twoją pracą, a co zrobiło narzędzie AI lub ktoś inny.",
      options: knowOnly,
    },
    {
      id: "q3",
      text: "Co zmieniło się po wdrożeniu: liczba albo „nie mierzyliśmy”.",
      options: knowOrMeasured,
    },
    {
      id: "q4",
      text: "Co poszło źle w pierwszej wersji i jaka była Twoja poprawka.",
      options: knowOnly,
    },
    {
      id: "q5",
      text: "Skąd wiesz, że to działało i co by pokazało, że nie działa.",
      options: knowOrMeasured,
    },
  ],
  build: [
    {
      id: "q1",
      text: "Opisz jeden komponent lub system zbudowany przez Ciebie: do czego służył i kto z niego korzystał.",
      options: knowOnly,
    },
    {
      id: "q2",
      text: "Które części są Twoim kodem, a które wygenerowało narzędzie AI lub napisał ktoś inny.",
      options: knowOnly,
    },
    {
      id: "q3",
      text: "Co działo się po uruchomieniu: ilu użytkowników, jak często, jaki wynik albo „nie mierzyliśmy”.",
      options: knowOrMeasured,
    },
    {
      id: "q4",
      text: "Co poszło źle w pierwszej wersji i jaka była Twoja poprawka.",
      options: knowOnly,
    },
    {
      id: "q5",
      text: "Jak wyglądało Twoje sprawdzenie, że to działa (jakie testy), i co by pokazało, że nie działa.",
      options: knowOrMeasured,
    },
  ],
  lead: [
    {
      id: "q1",
      text: "Opisz jedną inicjatywę z AI prowadzoną przez Ciebie: cel, zakres, budżet, zespół.",
      options: knowOnly,
    },
    {
      id: "q2",
      text: "Jakie decyzje były Twoje, a jakie podjął ktoś inny (zarząd, dostawca).",
      options: knowOnly,
    },
    {
      id: "q3",
      text: "Co zmieniło się po Twojej decyzji: liczba albo „nie mierzyliśmy”.",
      options: knowOrMeasured,
    },
    {
      id: "q4",
      text: "Co poszło źle lub która Twoja decyzja została cofnięta.",
      options: knowOnly,
    },
    {
      id: "q5",
      text: "Skąd wiesz, że inicjatywa się opłaciła.",
      options: knowOrMeasured,
    },
  ],
};

/** Static recruiter guide (draft wording, synthetic examples). Shown to employers only. */
export const recruiterGuide: {
  common: string;
  examples: Record<JobCategory, { concrete: string; generic: string }>;
} = {
  common:
    "Oceniasz, czy odpowiedź jest konkretna, a nie czy jest technicznie poprawna. Konkretna odpowiedź wskazuje osobę lub grupę, liczbę, zdarzenie albo błąd i oddziela to, co kandydat zrobił sam, od tego, co zrobiło narzędzie lub zespół. „Nie wiem” i „Nie mierzyliśmy” to uczciwe odpowiedzi, a nie minus. Karta nie potwierdza umiejętności ani prawdziwości odpowiedzi: traktuj ją jako materiał do pytań na rozmowie.",
  examples: {
    build: {
      concrete:
        "Napisałem moduł wyszukiwania w bazie umów; szkielet zapytań wygenerował Copilot, testy regresji na 150 przypadkach napisałem sam. Korzysta z niego 40 prawników. Pierwsza wersja zwracała wygasłe umowy, więc dodałem filtr dat.",
      generic: "Uczestniczyłem w przygotowaniu i doskonaleniu rozwiązania opartego na AI.",
    },
    apply: {
      concrete:
        "Wdrożyłam automatyczną kategoryzację zgłoszeń dla 12 konsultantów. Kategorie i test na 200 starych zgłoszeniach przygotowałam sama, klasyfikuje model. Czas pierwszej odpowiedzi spadł z 9 do 6 godzin. Na początku model mylił reklamacje ze zwrotami.",
      generic:
        "Odpowiadałam za wdrożenie AI w procesach firmy, co znacząco zwiększyło efektywność.",
    },
    lead: {
      concrete:
        "Prowadziłem 4-miesięczny pilotaż streszczania dokumentów w dziale prawnym: budżet 60 tys. zł, 3 osoby. Sam zawęziłem pilotaż do umów najmu, dostawcę zatwierdził zarząd. Po dwóch miesiącach wycofałem drugi moduł, bo prawnicy i tak czytali całe dokumenty.",
      generic: "Kierowałem transformacją AI w organizacji i budowałem kulturę innowacji.",
    },
  },
};

export const MAX_CONTRIBUTION_ANSWER_LENGTH = 2000;
export const CONTRIBUTION_QUESTION_COUNT = contributionQuestionIds.length;

const questionId = z.enum(contributionQuestionIds);
const answerText = z.string().max(MAX_CONTRIBUTION_ANSWER_LENGTH);
const uniqueIds = (answers: readonly { id: string }[]) =>
  new Set(answers.map((answer) => answer.id)).size === answers.length;

/**
 * What the form edits, the draft stores and `submit` receives. `text` is kept while an option is
 * selected so the candidate can return to writing; only `kind: "text"` submits the text.
 */
export const contributionAnswerInputSchema = z.object({
  id: questionId,
  kind: z.enum(["text", ...contributionOptionKinds]),
  text: answerText,
});
export type ContributionAnswerInput = z.infer<typeof contributionAnswerInputSchema>;

export const contributionCardInputSchema = z
  .array(contributionAnswerInputSchema)
  .max(CONTRIBUTION_QUESTION_COUNT)
  .refine(uniqueIds, { message: "Duplicate contribution question" });
export type ContributionCardInput = z.infer<typeof contributionCardInputSchema>;

export const contributionAnswerKinds = ["text", ...contributionOptionKinds, "empty"] as const;
export type ContributionAnswerKind = (typeof contributionAnswerKinds)[number];

/** Immutable copy stored on a submitted application. Absent means the job had no card. */
export const contributionCardSnapshotSchema = z.object({
  mode: z.enum(["optional", "required"]),
  category: z.enum(jobCategories),
  answers: z
    .array(
      z.object({
        id: questionId,
        question: z.string().trim().min(1).max(500),
        kind: z.enum(contributionAnswerKinds),
        text: answerText,
      }),
    )
    .length(CONTRIBUTION_QUESTION_COUNT)
    .refine(uniqueIds, { message: "Duplicate contribution question" }),
});
export type ContributionCardSnapshot = z.infer<typeof contributionCardSnapshotSchema>;

export type ContributionCardStatus = "complete" | "partial" | "skipped" | "none";

export const contributionCardStatusLabels: Record<ContributionCardStatus, string> = {
  complete: "Karta wypełniona",
  partial: "Karta częściowo wypełniona",
  skipped: "Karta pominięta",
  none: "Bez karty",
};

/** Missing answer = no text after trimming and no "Nie wiem"/"Nie mierzyliśmy" option. */
export function isContributionAnswered(answer: Pick<ContributionAnswerInput, "kind" | "text">) {
  return answer.kind !== "text" || answer.text.trim().length > 0;
}

export function answeredContributionCount(
  answers: readonly Pick<ContributionAnswerInput, "kind" | "text">[] | undefined,
) {
  return (answers ?? []).filter(isContributionAnswered).length;
}

export function contributionCardStatus(
  snapshot: ContributionCardSnapshot | undefined,
): ContributionCardStatus {
  if (!snapshot) return "none";
  const answered = snapshot.answers.filter((answer) => answer.kind !== "empty").length;
  if (answered === 0) return "skipped";
  return answered === snapshot.answers.length ? "complete" : "partial";
}

/** Empty editable card for a job category, merged with a saved draft when available. */
export function contributionCardDraft(
  category: JobCategory,
  saved: ContributionCardInput | undefined,
): ContributionAnswerInput[] {
  return contributionQuestions[category].map((question) => {
    const previous = saved?.find((answer) => answer.id === question.id);
    const kind =
      previous && (previous.kind === "text" || question.options.includes(previous.kind))
        ? previous.kind
        : "text";
    return { id: question.id, kind, text: previous?.text ?? "" };
  });
}

export function missingContributionMessage(missing: number) {
  return `Karta wkładu jest obowiązkowa. Brakuje odpowiedzi na ${missing} z ${CONTRIBUTION_QUESTION_COUNT} pytań. Możesz zaznaczyć „Nie wiem”.`;
}

/**
 * Domain validation for `submit`. Returns the snapshot to store, or undefined when the job has no
 * card. Throws a Polish message for answers that do not match the role's questions or for a
 * required card with gaps.
 */
export function buildContributionSnapshot(
  category: JobCategory,
  mode: ContributionCardMode,
  input: unknown,
): ContributionCardSnapshot | undefined {
  if (mode === "none") return undefined;
  const parsed = contributionCardInputSchema.safeParse(input ?? []);
  if (!parsed.success) throw new Error("Odpowiedzi karty wkładu nie pasują do pytań tej oferty.");
  const questions = contributionQuestions[category];
  for (const answer of parsed.data) {
    const question = questions.find((item) => item.id === answer.id);
    if (!question || (answer.kind !== "text" && !question.options.includes(answer.kind)))
      throw new Error("Odpowiedzi karty wkładu nie pasują do pytań tej oferty.");
  }
  const answers = questions.map((question) => {
    const answer = parsed.data.find((item) => item.id === question.id);
    const text = answer?.text.trim() ?? "";
    const kind: ContributionAnswerKind =
      !answer || (answer.kind === "text" && !text) ? "empty" : answer.kind;
    return { id: question.id, question: question.text, kind, text: kind === "text" ? text : "" };
  });
  const missing = answers.filter((answer) => answer.kind === "empty").length;
  if (mode === "required" && missing > 0) throw new Error(missingContributionMessage(missing));
  return contributionCardSnapshotSchema.parse({ mode, category, answers });
}
