# P1A — Contribution card ("Karta wkładu")

Slug: `p1a-contribution-card`
Created: 2026-11-09
Status: **implemented on `feature/P1A`** (plan approved by the product owner on 2026-11-09)

## Goal

Ship a thin but genuinely working contribution-card flow inside the existing prototype workflows:

1. The employer chooses a card mode per job (none / optional / required) when creating or editing it.
2. The candidate answers five role-specific questions (Build / Apply / Lead) in the application form.
3. The employer reads the answers in the application detail next to a static, role-specific reading guide.

This is not a mock-up or separate demo screen.

## Context (why)

- Applications doubled (9k → 18k / month) while revenue is flat; the goal is to move 90-day employer repurchase from 30% to 60%.
- Since June 2026 the AI assistant writes most applications. Match Score rose (68.1 → 75.9) but no longer predicts progress after the first conversation (correlation 0.232 → −0.037).
- Focus opportunity OP1: recruiters cannot see what the candidate did personally and whether it worked. Candidates with material from their own work progress in 34–52% of cases, demo material only in 12–24%; Match Score does not see the difference.
- ID1 / P1A tests five short own-words questions about one project. The recruiter judges **concreteness** (person, number, event, mistake, own vs. tool work), not technical correctness — a form check a non-technical person can do.
- Promise boundary: the card does not verify skills; "concrete" does not mean "true". No UI text may suggest that the card confirms competence, truthfulness or hiring chances.
- No AI assistance on the card: in June 2026, 69% of assistant-rewritten answers kept no concrete sentence from the original; 11,694 of 11,700 contained the same generic sentence.
- Observation needs (no dashboard/telemetry in this task): adoption of modes per role, optional-card fill rate, share of "Nie wiem"/"Nie mierzyliśmy", recruiter decisions for card / no card / skipped card, differences between roles. Therefore card data is stored structurally and countably.

## Fixed product decisions (not changed by this task)

1. Three job modes: "Bez karty", "Karta opcjonalna", "Karta obowiązkowa"; chosen by the employer.
2. Five fixed questions per `job.category`; text lives in one config module; no AI-generated or recruiter-written questions.
3. "Nie wiem" (all questions) and "Nie mierzyliśmy" (`q3`, `q5`) count as complete answers.
4. Optional card: the application can be sent with no card answers.
5. Required card: no submission until all five questions are answered; enforced in `transition()`, not only in the form.
6. Recruiter guide is static per role; no automated scoring/classification (ID4 is deferred).
7. No AI assistant on the card; Match Score and summary unchanged.
8. Only the employer sees the guide.

## Acceptance criteria

- [x] Employer selects the card mode (none / optional / required) on create and edit, sees a question preview for the current category; default for a new job is "Bez karty".
- [x] Candidate sees card information on the offer page and the five role-specific questions in the application form.
- [x] Questions are copied verbatim (gender-neutral version); no new candidate-facing text uses gendered forms.
- [x] "Nie wiem" (all) and "Nie mierzyliśmy" (`q3`, `q5`) are available and count as answers.
- [x] Required card with gaps blocks submission in the form and in `transition()`; message + focus lead to the gap; no data is lost.
- [x] Optional card allows submission with no answers.
- [x] Draft keeps card answers (including options and text typed before choosing an option).
- [x] Submitted application holds an immutable card snapshot including question text; later job edits do not change it.
- [x] Employer sees a "Karta wkładu" tab distinguishing "Nie wiem" / "Nie mierzyliśmy" / "Kandydat nie odpowiedział" / "Karta pominięta", plus the static guide for the role.
- [x] Employer candidate list shows a textual card-status marker.
- [x] Candidate sees their own card in the submitted copy without the recruiter guide.
- [x] No AI assistant anywhere on the card; Match Score and summary unchanged.
- [x] Old localStorage saves and old export files load without error; import/export include the new fields.
- [x] "Bez karty" jobs behave as before (existing E2E assertions unchanged and passing).
- [x] New UI follows Poster People and works at mobile/desktop widths and keyboard-only.
- [x] Domain and E2E tests for new paths added.
- [ ] `./scripts/verify` as one command — **partial**: not runnable here (`&` in path); its steps were run individually and reported below, two verifiers fail only on this checkout's CRLF line endings.
- [x] `FEATURES.md` and this file updated with actual results.

## Design — data model

### New module `src/features/prototype/contribution-card.ts`

Single source for wording and shared Zod schemas (used by forms and `transition()`):

- `contributionCardModes = ["none", "optional", "required"]`, Polish labels + one-sentence effect descriptions for the editor.
- `contributionQuestions: Record<JobCategory, Question[]>` where `Question = { id: "q1".."q5"; text: string; noDescription: ("dont_know" | "not_measured")[] }`. Every question allows `dont_know`; `q3` and `q5` additionally allow `not_measured`. Texts copied verbatim from the brief.
- `recruiterGuide = { common: string; examples: Record<JobCategory, { concrete: string; generic: string }> }` — copied verbatim, labelled as synthetic examples.
- `MAX_CONTRIBUTION_ANSWER_LENGTH = 2000`; no minimum length.
- Zod:
  - `contributionAnswerInputSchema = { id: q1..q5, kind: "text" | "dont_know" | "not_measured", text: string ≤ 2000 }` — what the form edits, the draft stores and `submit` receives. `text` is kept while an option is selected so the candidate can return to writing.
  - `contributionCardInputSchema = array(answerInput).max(5)` with unique ids.
  - `contributionCardSnapshotSchema = { mode: "optional" | "required", category, answers: [{ id, question, kind: "text" | "dont_know" | "not_measured" | "empty", text }] (exactly q1..q5, unique) }`.
- Pure helpers: `normalizeContributionCard(category, mode, input)` → snapshot or validation error (Polish message); `contributionCardStatus(snapshot | undefined)` → `"complete" | "partial" | "skipped" | "none"`; `answeredCount`.

### Changes in `model.ts` (backward compatible, `version` stays `1`, `STORAGE_KEY` unchanged)

- `jobSchema`: `contributionCard: z.enum(modes).default("none")`. Old saves, old exports and the unchanged fixtures parse as "Bez karty".
- `applicationSchema`: `contributionCard: contributionCardSnapshotSchema.optional()`. Absent = no card (job without card or application from before the change).
- `draftSchema`: `contributionCard: contributionCardInputSchema.optional()`.
- `Action` `draft` and `submit`: optional `contributionCard` input.
- `transition("submit")`, in order: existing job/consent/duplicate checks, then
  - mode `none` → no snapshot stored (any input ignored);
  - unknown question id, duplicate id, or an option the question does not allow (e.g. `not_measured` on `q1`) → error;
  - `kind: "text"` with empty trimmed text → `empty`; option kinds store `text: ""` (typed text is not submitted);
  - mode `required` and any `empty` → error "Karta wkładu jest obowiązkowa. Brakuje odpowiedzi na N z 5 pytań. Możesz wybrać „Nie wiem”."
  - snapshot copies mode, category and question text at submission time.
- **Status is derived, not stored**, so it can never disagree with the answers. Everything P1A wants to observe is countable from state alone: `jobs[].contributionCard` × `category` (adoption per role), `applications[].contributionCard` (absent / mode / per-answer `kind`) and `stage`/`events` (recruiter decisions).
- Snapshot schema validation stays structural (five unique ids, valid kinds). It deliberately does not re-check category rules against current code, so future wording/rule changes never invalidate historical records or exports.

## Design — UI (Poster People host recipes)

### Employer job editor (`EmployerJobEditor`, EMP-03/04/05)

- Category becomes a controlled `FormSelect` (`onValueChange`) so the preview follows it.
- Directly under "Kategoria" (full grid width): a `fieldset` "Karta wkładu" with a **radio group** of three options, each with a one-sentence effect, e.g. "Karta obowiązkowa — kandydat nie wyśle aplikacji bez odpowiedzi na 5 pytań; „Nie wiem” jest dozwolone." Default "Bez karty" for new jobs; existing jobs show their stored mode.
- Native disclosure "Podgląd pytań dla roli {Build|Apply|Lead}" with the five questions, reusing the existing disclosure recipe.
- Saved through the existing `publish` action; the approval requirement is unchanged. Changing the mode resets approval (like other content changes). Changing mode after publication only affects later applications (snapshots are immutable).

### Offer page (`marketplace.tsx`, PUB-06)

- When the job has a card: one short note in the conditions/actions card, before the Apply action: "Ta oferta prosi o kartę wkładu: 5 pytań o jeden Twój projekt, ok. 10 minut. Karta jest obowiązkowa / opcjonalna." Jobs without a card are unchanged.

### Application form (`ApplyPage`, CAN-09/10/13)

- New section "Karta wkładu" after "Dlaczego pasujesz do tej roli?" and before consent; absent for "Bez karty" (form identical to today).
- Intro: purpose + "Liczą się Twoje własne słowa — odpowiadasz bez pomocy AI." For optional: "Karta jest opcjonalna — możesz ją pominąć i wysłać aplikację."
- Per question: labelled textarea (`maxLength` 2000), a checkbox "Nie wiem" and, for `q3`/`q5`, "Nie mierzyliśmy" (mutually exclusive). Choosing an option disables the textarea but keeps its text with a visible note: "Wpisany tekst zostaje zachowany, ale nie zostanie wysłany, dopóki zaznaczona jest ta opcja." Unchecking restores writing.
- Counter "Odpowiedzi: 3 z 5".
- Submission order follows DOM order: short answer → missing required card answers (`role="alert"` with the count, `aria-invalid` on gaps, focus on the first empty textarea) → consent. Nothing is cleared.
- Consent text for card jobs: "Zatwierdzam treść aplikacji i karty wkładu oraz przesłanie profilu i przykładowego CV pracodawcy." Any card edit resets consent. Unchanged text for jobs without card.
- "Zapisz szkic" stores card answers and options; reopening `/#/aplikuj/:slug` restores them; submission deletes the draft. Draft answers are sanitized against the current job's questions on load (e.g. category changed).

### Application detail (`ApplicationRecord` → `RecordSheet`, EMP-08 / CAN-15)

- New third tab "Karta wkładu" next to "Odpowiedź" and "CV", same Base UI keyboard tabs.
- Content: H3 "Karta wkładu", meta line (role, mode at submission time, "Odpowiedzi: N z 5"), ordered list question → answer.
- "Nie wiem" / "Nie mierzyliśmy" render as a labelled noninteractive fact tag (C07 outlined treatment), "Kandydat nie odpowiedział" (employer) / "Bez odpowiedzi" (candidate) as distinct muted text — never colour only.
- Skipped card: one sentence "Kandydat pominął kartę wkładu (karta była opcjonalna)." instead of an empty list.
- Employer only: native disclosure "Jak czytać kartę" (open by default), placed **before** the answers so it comes first on mobile and stays next to the answers on desktop; contains the common guide + the concrete/generic examples for the application's role.
- Long unbroken text wraps (`overflow-wrap: anywhere`).

### Employer candidate list (`ApplicationsPage employer`, EMP-07)

- Textual marker per row: "Karta wypełniona" / "Karta częściowo wypełniona" / "Karta pominięta" / "Bez karty". Informational only — no sorting or filtering.

## Decisions taken in this plan (please confirm)

1. **Data shape:** status derived from per-answer `kind` instead of stored (no inconsistency; still countable). Question text is copied into the snapshot.
2. **"Nie wiem" control:** Base UI `Checkbox` per allowed option (existing primitive, C04 anatomy, keyboard Space, announced name/state), mutually exclusive per question; textarea disabled while selected, text kept and explained. Alternative considered: toggle buttons with `aria-pressed` — rejected as less familiar in a form.
3. **Mode control:** radio group (one choice with a description per option fits better than a select). There is no radio primitive yet, so I will add `src/components/ui/radio-group.tsx` wrapping Base UI `Radio`/`RadioGroup` (already shipped inside `@base-ui/react`, **no new dependency**), styled with the C04 checkbox tokens.
4. **Job without card in the detail view:** the tab is **not shown**. Reason: the "Bez karty" path must look and behave exactly as today (and existing tests keep two tabs); the list marker "Bez karty" already states it explicitly. Applications with a skipped optional card do get the tab with the one-sentence explanation.
5. **Guide placement:** disclosure open by default above the answers (instead of a side column), because the record sheet is already a narrow reading column beside the process margin; this also satisfies "on mobile before the answers".
6. **Card status marker in the candidate's own list:** not added (not requested); the candidate sees the card in the submitted copy.

## Files / areas

- New: `src/features/prototype/contribution-card.ts`, `src/features/prototype/contribution-card-view.tsx` (form section, reading tab, status marker; renamed from the planned `.tsx` twin because `./contribution-card` resolves to the `.ts` module first), `src/components/ui/radio-group.tsx`, `src/features/prototype/contribution-card.test.ts`.
- Changed: `model.ts`, `model.test.ts`, `storage.test.ts`, `employer.tsx`, `workspace.tsx`, `application-record.tsx`, `recruiting-application.tsx`, `candidate-application.tsx`, `marketplace.tsx`, `src/app/application.css`, `src/app/records.css`, `tests/e2e/prototype.spec.ts`, `FEATURES.md`, this file; host catalog section in `docs/design-system/HOST-COMPONENTS.md` for the new owners (RECORDS.md unchanged: RecordSheet API is unchanged).
- Not changed: `data/marketplace.json`, `data/people.json`, `docs/design-system/agent-kit/`, stages, Match Score, summary, `/#/app/case`.

## Risks

- Backward compatibility: `.default("none")` on a refined object schema — covered by unit tests on old fixtures, old saved JSON and old export files.
- Existing E2E tests use `getByRole("checkbox")` (single checkbox) on the editor and application form. Kept valid because card checkboxes appear only for card jobs and the mode control uses radios.
- Snapshot size: 5 × 2,000 chars per application stays well within the 2 MB storage/import limit for prototype volumes.
- Gendered language: recruiter-facing labels from the brief ("Kandydat nie odpowiedział") are kept as specified; all candidate-facing strings are checked for "-łeś/-łaś"/"(a)".
- Environment: Node 25.9 (project expects 24); `npm run …` breaks on the `&` in the path, so tools run via `node node_modules/...`. **Playwright Chromium is not installed** (`%LOCALAPPDATA%\ms-playwright` missing) and `playwright.config.ts` starts `npm run preview`, which fails on this path. Without approval to download Chromium, E2E tests can be written but not executed here; this will be reported, not hidden.

## Out of scope (possible next steps)

- Automated concreteness scoring, points, sorting/filtering by card (ID4).
- AI assistant, hints or generation on the card.
- Recruiter-written questions or a sixth field.
- One-time card in the candidate profile (P1B).
- Statistics panel / telemetry; `/#/app/case` unchanged.
- Changes to Match Score, summary, stages or fixtures.
- Validating question wording with recruiters.

## Plan

- [x] Review relevant code/docs (AGENTS, CLAUDE, BRIEF, GUI, FEATURES, design-system README/IMPLEMENTATION/VERIFICATION/HOST-COMPONENTS/RECORDS/STATUS, kit design/API/C02/C04/C07; prototype model/storage/store/workspace/employer/records/marketplace; existing tests)
- [x] Inspect current application and employer screens in the browser
- [x] Card module + domain tests
- [x] Model/`transition()` + tests (modes, "Nie wiem", required gaps, old state/import compatibility, snapshot immutability)
- [x] Job editor
- [x] Application form + draft
- [x] Application detail (employer + candidate)
- [x] Employer list marker
- [x] Offer page note
- [x] E2E journeys (a)–(e)
- [x] Verification (individual `./scripts/verify` steps — see Results), browser checks 320/390/1280 + keyboard
- [x] FEATURES.md, host docs, results in this file
- [x] Separate review pass of the diff

## Results (2026-11-09, Windows 11, Node 25.9.0 — project expects Node 24)

`npm run …` fails on this machine because the repository path contains `&`, so every tool was run directly with `node node_modules/...`. `./scripts/verify` as a whole was therefore **not** run; its steps were run individually:

| Step (`npm run check` order)    | Command actually run                                                                                                                                                                                                          | Result                                                                                                                                                                                                                                            |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| format:check                    | `prettier --check` on all changed/new files                                                                                                                                                                                   | pass. Whole-repo check reports 115 files because this Windows checkout has CRLF working copies (`core.autocrlf=true`); pre-existing, not caused by this change                                                                                    |
| design-system:check             | `node docs/design-system/verify-kit.mjs`                                                                                                                                                                                      | **fails** on `.nvmrc` hash — CRLF working copy; agent-kit is untouched (`git status` clean)                                                                                                                                                       |
| design-system:check (kit tests) | `node --test tests/*.test.mjs` in agent-kit                                                                                                                                                                                   | pass, 6/6                                                                                                                                                                                                                                         |
| lint                            | `eslint --max-warnings=0 .`                                                                                                                                                                                                   | pass                                                                                                                                                                                                                                              |
| typecheck                       | `tsc --noEmit`                                                                                                                                                                                                                | pass                                                                                                                                                                                                                                              |
| unit tests                      | `vitest run`                                                                                                                                                                                                                  | pass, 44/44 (6 files; 17 new card/model/storage tests)                                                                                                                                                                                            |
| verify:packet                   | `node scripts/verify-participant.mjs`                                                                                                                                                                                         | **fails** on CSV CRLF comparison — same checkout line-ending issue, files untouched                                                                                                                                                               |
| build                           | `vite build`                                                                                                                                                                                                                  | pass                                                                                                                                                                                                                                              |
| browser journeys                | Playwright with a local, git-ignored `test-results/edge.config.ts` using the installed **Microsoft Edge** (`channel: "msedge"`) and `vite preview` via node; Playwright Chromium is not provisioned and nothing was installed | 40/40 pass (34 existing unchanged + 6 new). One earlier full run had 1 failure in the existing `offer section links … through history` test (focus "inactive" under parallel load); it passed 5/5 with `--repeat-each=5` and in the next full run |

New E2E journeys: (a) required card with gaps → alert/focus/data kept → "Nie wiem"/"Nie mierzyliśmy" → draft reload → submit → recruiter marker, tab, tags, guide → reload; (b) skipped optional card → "Karta pominięta" + one sentence; (c) candidate copy without guide; (d) legacy save without card fields; (e) axe (WCAG 2 A/AA) + no horizontal overflow on editor, form with error, candidate list and card tab at 1280 and 390 px.

Manual browser checks (in-app browser, dev server on 3001): editor radio group and preview (desktop), roving tabindex/`aria-checked` on radios, offer note, form validation focus on q3, keyboard Tab+Space on "Nie wiem", draft restore after navigation, submit snapshot in localStorage, candidate tab without guide, employer list markers, employer tab via ArrowRight keyboard selection, 320 px reflow with a 2,000-character unbroken answer in both the form and the employer tab (no element overflow; tabs wrap to a second row).

Not covered: real Playwright Chromium/CI run, Node 24, `./scripts/verify` as one command, screen-reader testing with real assistive technology, validation of question wording with recruiters.

## Review pass

- Domain validation: `transition("submit")` enforces required cards, rejects unknown/duplicate ids and disallowed options, ignores input for "Bez karty"; option answers never submit typed text. Covered by unit tests.
- Backward compatibility: no `version`/`STORAGE_KEY` change, fixtures untouched, old saves/exports parse to "Bez karty" (unit + E2E), export includes `contributionCard`.
- Accessibility: labelled textareas, named option checkboxes ("Nie wiem (pytanie N)"), radio group named by legend with descriptions, `role="alert"` + focus on first gap, text markers (not colour only), axe clean at 1280/390.
- Copy: candidate-facing strings checked for gendered forms; no text claims verification, truthfulness or hiring chances (only explicit negations). Recruiter examples are the brief's synthetic, recruiter-only wording.
- Known limitations: a draft saved while a job has no card does not keep earlier card answers; changing a job's category after a candidate saved a draft drops options the new role does not allow (sanitized on load); snapshot validation is structural by design.

## Handoff notes

Possible next steps: operator view counting adoption/fill rates/"Nie wiem" share from local state; validating question and guide wording with recruiters; running the gate on Node 24/CI with provisioned Chromium.
