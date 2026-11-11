import { ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Radio, RadioGroup } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { categoryLabels } from "@/features/jobs/presentation";
import type { JobCategory } from "@/features/jobs/types";
import {
  answeredContributionCount,
  CONTRIBUTION_QUESTION_COUNT,
  contributionCardModeDescriptions,
  contributionCardModeLabels,
  contributionCardModes,
  contributionCardStatus,
  contributionCardStatusLabels,
  contributionOptionLabels,
  contributionQuestions,
  isContributionAnswered,
  MAX_CONTRIBUTION_ANSWER_LENGTH,
  missingContributionMessage,
  recruiterGuide,
  type ContributionAnswerInput,
  type ContributionCardMode,
  type ContributionCardSnapshot,
  type ContributionOptionKind,
} from "./contribution-card";

export const contributionFieldId = (id: string) => `contribution-${id}`;

/** Employer job editor: mode choice with effects plus the current role's question preview. */
export function ContributionModeField({
  mode,
  category,
  onModeChange,
}: {
  mode: ContributionCardMode;
  category: JobCategory;
  onModeChange: (mode: ContributionCardMode) => void;
}) {
  return (
    <fieldset className="contribution-mode sm:col-span-2" aria-describedby="contribution-mode-help">
      <legend id="contribution-mode-legend">Karta wkładu</legend>
      <p className="contribution-help" id="contribution-mode-help">
        Pięć stałych pytań o jeden projekt kandydata, zależnych od kategorii oferty. Odpowiedzi są
        materiałem do rozmowy, a nie potwierdzeniem umiejętności.
      </p>
      <RadioGroup
        className="contribution-mode-options"
        aria-labelledby="contribution-mode-legend"
        value={mode}
        onValueChange={(value) => onModeChange(value as ContributionCardMode)}
      >
        {contributionCardModes.map((value) => (
          <label key={value} className="contribution-mode-option">
            <Radio
              value={value}
              aria-labelledby={`contribution-mode-${value}`}
              aria-describedby={`contribution-mode-${value}-description`}
            />
            <span>
              <span id={`contribution-mode-${value}`} className="contribution-mode-label">
                {contributionCardModeLabels[value]}
              </span>
              <span id={`contribution-mode-${value}-description`} className="contribution-help">
                {contributionCardModeDescriptions[value]}
              </span>
            </span>
          </label>
        ))}
      </RadioGroup>
      <details className="contribution-disclosure">
        <summary>
          Podgląd pytań dla roli {categoryLabels[category]}
          <ChevronDown aria-hidden="true" className="size-4" />
        </summary>
        <ol className="contribution-preview">
          {contributionQuestions[category].map((question) => (
            <li key={question.id}>{question.text}</li>
          ))}
        </ol>
      </details>
    </fieldset>
  );
}

/** Candidate application form section. No AI help: answers are the candidate's own words. */
export function ContributionCardFields({
  mode,
  category,
  answers,
  attempted,
  disabled,
  onChange,
}: {
  mode: Exclude<ContributionCardMode, "none">;
  category: JobCategory;
  answers: ContributionAnswerInput[];
  attempted: boolean;
  disabled: boolean;
  onChange: (answers: ContributionAnswerInput[]) => void;
}) {
  const answered = answeredContributionCount(answers);
  const missing = CONTRIBUTION_QUESTION_COUNT - answered;
  const showErrors = attempted && mode === "required" && missing > 0;
  const update = (id: string, change: Partial<ContributionAnswerInput>) =>
    onChange(answers.map((answer) => (answer.id === id ? { ...answer, ...change } : answer)));
  return (
    <section
      className="application-form-section contribution-card"
      aria-labelledby="contribution-title"
    >
      <h3 id="contribution-title">Karta wkładu</h3>
      <p className="application-help">
        Pięć krótkich pytań o jeden Twój projekt. Liczą się Twoje własne słowa, więc odpowiadasz bez
        pomocy AI. „Nie wiem” i „Nie mierzyliśmy” to dozwolone odpowiedzi.
      </p>
      <p className="contribution-mode-note">
        {mode === "optional"
          ? "Karta jest opcjonalna: możesz ją pominąć i wysłać aplikację bez odpowiedzi."
          : "Karta jest obowiązkowa: odpowiedz na każde pytanie własnym opisem albo zaznacz dostępną opcję."}
      </p>
      <p className="contribution-count" id="contribution-count">
        Odpowiedzi: {answered} z {CONTRIBUTION_QUESTION_COUNT}
      </p>
      {showErrors && (
        <p className="error-message" role="alert" id="contribution-error">
          {missingContributionMessage(missing)}
        </p>
      )}
      <ol className="contribution-questions">
        {contributionQuestions[category].map((question, index) => {
          const answer = answers.find((item) => item.id === question.id)!;
          const number = index + 1;
          const fieldId = contributionFieldId(question.id);
          const invalid = showErrors && !isContributionAnswered(answer);
          const option = answer.kind === "text" ? null : answer.kind;
          return (
            <li key={question.id} className="contribution-question">
              <label htmlFor={fieldId} className="contribution-question-label">
                <span aria-hidden="true">{number}. </span>
                {question.text}
              </label>
              <Textarea
                id={fieldId}
                rows={3}
                disabled={disabled || option !== null}
                maxLength={MAX_CONTRIBUTION_ANSWER_LENGTH}
                aria-invalid={invalid || undefined}
                aria-describedby={`${fieldId}-hint${showErrors ? " contribution-error" : ""}`}
                value={answer.text}
                onChange={(event) => update(question.id, { text: event.target.value })}
              />
              <div
                className="contribution-options"
                role="group"
                aria-label={`Odpowiedź bez opisu na pytanie ${number}`}
              >
                {question.options.map((kind: ContributionOptionKind) => (
                  <label key={kind} className="contribution-option">
                    <Checkbox
                      disabled={disabled}
                      checked={answer.kind === kind}
                      onCheckedChange={(checked) =>
                        update(question.id, { kind: checked ? kind : "text" })
                      }
                      aria-label={`${contributionOptionLabels[kind]} (pytanie ${number})`}
                    />
                    <span>{contributionOptionLabels[kind]}</span>
                  </label>
                ))}
              </div>
              <p id={`${fieldId}-hint`} className="contribution-hint">
                {option
                  ? answer.text.trim()
                    ? `Zaznaczono „${contributionOptionLabels[option]}”. Wpisany tekst zostaje zachowany, ale nie zostanie wysłany, dopóki ta opcja jest zaznaczona.`
                    : `Zaznaczono „${contributionOptionLabels[option]}”. To pełna odpowiedź.`
                  : `${answer.text.length} / ${MAX_CONTRIBUTION_ANSWER_LENGTH} znaków.`}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Submitted card copy. The recruiter guide is rendered for the employer audience only. */
export function ContributionCardRecord({
  card,
  audience,
}: {
  card: ContributionCardSnapshot;
  audience: "candidate" | "employer";
}) {
  const employer = audience === "employer";
  const status = contributionCardStatus(card);
  const answered = card.answers.filter((answer) => answer.kind !== "empty").length;
  const example = recruiterGuide.examples[card.category];
  return (
    <div className="contribution-record">
      <h3>Karta wkładu</h3>
      <p className="record-caption contribution-record-meta">
        Rola: {categoryLabels[card.category]} · {contributionCardModeLabels[card.mode]} w chwili
        wysłania · Odpowiedzi: {answered} z {card.answers.length}
      </p>
      {status === "skipped" ? (
        <p className="contribution-skipped">
          {employer
            ? "Kandydat pominął kartę wkładu (karta była opcjonalna)."
            : "Karta wkładu została pominięta (była opcjonalna)."}
        </p>
      ) : (
        <>
          {employer && (
            <details className="contribution-disclosure contribution-guide" open>
              <summary>
                Jak czytać kartę
                <ChevronDown aria-hidden="true" className="size-4" />
              </summary>
              <div className="contribution-guide-body">
                <p>{recruiterGuide.common}</p>
                <h4>Przykłady dla roli {categoryLabels[card.category]}</h4>
                <p>
                  <strong>Konkretna:</strong> „{example.concrete}”
                </p>
                <p>
                  <strong>Ogólnikowa:</strong> „{example.generic}”
                </p>
                <p className="record-caption">Przykłady są syntetyczne.</p>
              </div>
            </details>
          )}
          <ol className="contribution-answers">
            {card.answers.map((answer) => (
              <li key={answer.id}>
                <h4>{answer.question}</h4>
                {answer.kind === "text" ? (
                  <p>{answer.text}</p>
                ) : answer.kind === "empty" ? (
                  <p className="contribution-empty">
                    {employer ? "Kandydat nie odpowiedział" : "Bez odpowiedzi"}
                  </p>
                ) : (
                  <p>
                    <span className="contribution-mark">
                      {contributionOptionLabels[answer.kind]}
                    </span>
                  </p>
                )}
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}

/** Informational marker in the employer list; it never sorts or filters. */
export function ContributionCardStatusTag({
  card,
}: {
  card: ContributionCardSnapshot | undefined;
}) {
  return (
    <span className="contribution-status">
      {contributionCardStatusLabels[contributionCardStatus(card)]}
    </span>
  );
}

export function contributionOfferNote(mode: ContributionCardMode | undefined) {
  if (!mode || mode === "none") return null;
  return `Ta oferta prosi o kartę wkładu: 5 pytań o jeden Twój projekt, ok. 10 minut. Karta jest ${mode === "required" ? "obowiązkowa" : "opcjonalna"}.`;
}
