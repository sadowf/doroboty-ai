# Production readiness fixes A–D

Slug: `production-readiness-fixes`
Created: 2026-11-11
Status: **implemented on `feature/P1A`** (package A–D approved by the product owner on 2026-11-11)

## Goal

Close the agent-fixable preparation gaps found by the first production-readiness audit ([report](../production-readiness.html)) before the first static publication. Hosting is not chosen yet (Netlify or GitHub Pages are preferred), so provider configuration (package E) is out of scope.

## Context

- The app is a static Vite/React build with all scenario data in one browser-local key. Expected use: about 20 simultaneous AIPH3 participants; an outage blocks classes.
- Audit findings addressed here: `full-check-gate` (Windows CRLF checkouts break formatting and hash checks), `observability-preparation` (a render error leaves a blank page), `concurrent-writes` (two tabs silently overwrite each other), `repeatable-release`, `rollback`, `smoke-plan`, `recovery-plan` (no written procedures).

## Scope

- A. `.gitattributes` forces LF for text files and marks binary assets; existing CRLF working copies are normalized to the committed LF bytes (no content change in Git).
- B. A Polish fallback screen replaces a blank page after an unexpected render error, both inside the shell (navigation keeps working, resets on route change) and around the whole app. It offers reload, download of the raw local save, an inline-confirmed reset and reporting guidance without personal data.
- C. When another tab changes the saved scenario, this tab shows a notice, refuses further edits and does not write to storage until the person loads the current data. Explicit import/reset still replace data intentionally.
- D. `docs/RELEASE.md` with build, publication (Netlify / GitHub Pages), a five-minute smoke check, rollback condition and steps, and an outage procedure including the local fallback.

Out of scope: hosting configuration files, security headers, visible build version (package E), dev-dependency upgrades, bundle size.

## Design-system notes

Affected surfaces: shell notice area (all routes) and a new host fallback screen. No reference screen exists for either; both compose existing host recipes (`prototype-section` + H1/body + `Button`/`buttonVariants` as in `NotFound`; `Notice` with an action). No new color, font, radius or card family.

## Acceptance criteria

- [x] `.gitattributes` exists; `git ls-files --eol` shows no `w/crlf` text files after normalization.
- [x] A render error shows "Coś poszło nie tak" with working reload, save download, confirmed reset and back-to-offers actions; other navigation keeps working after a route-level error.
- [x] No private free text is logged by the new code.
- [x] A change in another tab shows a notice; edits in the stale tab are refused with an error; "Wczytaj aktualne dane" loads the other tab's state and clears the notice; nothing is written by the stale tab before that.
- [x] `docs/RELEASE.md` covers build, publish, smoke check, rollback and outage steps for Netlify and GitHub Pages.
- [x] Unit/e2e regressions added; FEATURES.md updated (SYS-09, SYS-10, new SYS-12).
- [x] `./scripts/verify` passes — in GitHub Actions CI on Node 24 for PR #2 (see Handoff Notes).

## Files / Areas

- `.gitattributes`, `src/features/prototype/error-boundary.tsx`, `src/features/prototype/store.tsx`, `src/features/prototype/storage.ts`, `src/features/prototype/shell.tsx`, `src/features/prototype/app.tsx`, `tests/e2e/prototype.spec.ts`, `src/features/prototype/storage.test.ts`, `docs/RELEASE.md`, `FEATURES.md`.

## Risks

- The stale-tab guard refuses all local operations (including switching persona) until the reload button is used; this is intentional to avoid silent overwrites.
- Browser journeys cannot run on the owner's Windows machine (no Playwright Chromium, Node 25, `&` in the path); CI on GitHub (Node 24) is the representative gate.

## Handoff Notes

Verification on 2026-11-11 (Windows, Node v25.9.0, tools run directly through `node` because `npm run` breaks on the `&` in the checkout path):

| Check                                            | Result                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| prettier --check                                 | pass (after LF normalization; generated readiness report added to .prettierignore — it failed before)                                                                                                                                                                                                     |
| docs/design-system/verify-kit.mjs                | pass, 67 files (failed before because of CRLF)                                                                                                                                                                                                                                                            |
| agent-kit `scripts/check.mjs`                    | **not run successfully**: requires Node 24 (`Use Node 24`)                                                                                                                                                                                                                                                |
| eslint, tsc                                      | pass                                                                                                                                                                                                                                                                                                      |
| vitest                                           | pass, 46/46 (2 new storage tests)                                                                                                                                                                                                                                                                         |
| scripts/verify-participant.mjs                   | pass (failed before because of CRLF)                                                                                                                                                                                                                                                                      |
| vite build                                       | pass (existing 650 KB chunk warning)                                                                                                                                                                                                                                                                      |
| Playwright journeys incl. 2 new tests            | **not run**: no Playwright Chromium on this machine; GitHub CI (Node 24) runs only for pull requests/`main`                                                                                                                                                                                               |
| Manual browser check on built app (vite preview) | two-tab notice/refusal/in-place reload; fallback on forced render error at 1024px and 375px (no overflow), keyboard focus for reset confirm/cancel, retry after navigation, download enabled, reset clears save; console shows only `Render error (Error)` + stack; main journey Anna → Karolina → reload |

`./scripts/verify` as a whole had therefore not passed locally on a representative environment.

CI on 2026-11-11 for [PR #2](https://github.com/sadowf/doroboty-ai/pull/2), merge commit `1e63265` (same content as the assessed sources), [job 130653107385](https://github.com/sadowf/doroboty-ai/actions/runs/43058161659/job/130653107385), ubuntu-26.04, Node v24.22.2: `./scripts/verify` passed — Prettier, kit (67 files) and agent-kit examples (6 tests), ESLint, tsc, Vitest 46/46, participant packet, build and Playwright 42/42 without retries, including both new journeys. One annotation (`actions/upload-artifact@v4` on deprecated Node 20) was addressed in [github-pages-release](github-pages-release.md).
