# GitHub Pages publication (readiness package E)

Slug: `github-pages-release`
Created: 2026-11-11
Status: **implemented on `feature/P1A`**, not yet published (publication needs the owner to enable Pages and merge to `main`)

## Goal

Make the first static publication repeatable on the provider chosen by the owner (sadowf, 2026-11-11): **GitHub Pages**. Only commits that passed the full CI gate on `main` are published, every build shows which commit it is, and the page applies the strongest security policy a static GitHub Pages site allows.

## Context

- Follows [production-readiness-fixes](production-readiness-fixes.md) (packages A–D) and the [readiness report](../production-readiness.html). Open preparation items addressed here: `environment`, `repeatable-release`, `security-headers` (recommendation) and a visible build identity for the smoke check and participant reports.
- GitHub Pages cannot set custom HTTP response headers. A `Content-Security-Policy` and a referrer policy can be set with `<meta>` tags; `frame-ancestors`, `X-Frame-Options` and HSTS cannot be controlled by the site.
- Action versions checked on 2026-11-11 (latest releases, all `node24`): `actions/configure-pages@v6`, `actions/upload-pages-artifact@v5`, `actions/deploy-pages@v5`, `actions/upload-artifact@v7`.

## Scope

- `.github/workflows/pages.yml`: runs after a **successful CI run for a push to `main`**, checks out exactly that commit, builds on Node 24 and deploys `dist/` to GitHub Pages. Manual run is available for re-publishing `main`; re-running an older Pages run re-publishes that older commit (rollback).
- Build identity: the build records the short commit hash and build time; Settings → "O prototypie" shows them and the error fallback asks participants to include the version in reports.
- Production build only: `<meta http-equiv="Content-Security-Policy">` (scripts only from the site itself, no plugins, no external connections, same-origin frames for the CV preview) and `<meta name="referrer" content="no-referrer">`. The dev server is unchanged.
- CI: `actions/upload-artifact` v4 → v7 (removes the Node 20 deprecation warning).
- `docs/RELEASE.md`, `FEATURES.md`, `docs/SECURITY.md` updated to the chosen provider.

Out of scope: enabling Pages in repository settings and merging to `main` (owner actions), custom domain, Netlify configuration, bundle-size work.

## Design-system notes

Affected surfaces: one sentence in the existing Settings "O prototypie" panel and one sentence in the existing fallback reporting paragraph. No new component, color, type role or layout.

## Acceptance criteria

- [ ] Pages workflow deploys only after a successful CI push run on `main`, from that exact commit, with least-privilege permissions.
- [x] Settings shows "Wersja aplikacji" with a 7-character commit hash and build date; the fallback mentions the version.
- [x] The built page carries the CSP and referrer meta tags; the main journey, CV PDF preview/download, export download and the map work without CSP violations.
- [x] `npm run dev` does not get the CSP (no change to local development).
- [x] e2e test asserts the policy is present and no violation occurs on core screens; version is visible.
- [x] RELEASE.md describes enabling Pages, the gated publication, the smoke check and rollback for GitHub Pages; FEATURES.md updated.
- [ ] `./scripts/verify` passes (CI on the pull request is the representative run).

## Files / Areas

`vite.config.ts`, `src/features/prototype/build-info.ts`, `src/build-info.d.ts`, `src/features/prototype/settings.tsx`, `src/features/prototype/error-boundary.tsx`, `.github/workflows/pages.yml`, `.github/workflows/ci.yml`, `tests/e2e/prototype.spec.ts`, `docs/RELEASE.md`, `docs/SECURITY.md`, `FEATURES.md`.

## Risks

- `style-src` must allow inline styles: Base UI's select list injects a small `<style>` element. Scripts stay restricted to the site itself.
- Clickjacking protection (`frame-ancestors`) is impossible on GitHub Pages; accepted because the app has no accounts, secrets or server-side actions.
- `workflow_run` workflows are read from the default branch, so the Pages workflow only becomes active after this change is merged to `main`.

## Handoff Notes

Verification on 2026-11-11 (Windows, Node v25.9.0, tools run directly through `node` because `npm run` breaks on the `&` in the checkout path):

| Check                                                                          | Result                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| prettier --check, verify-kit (67 files), eslint, tsc                           | pass                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| vitest                                                                         | pass, 48/48 (2 new `buildLabel` tests)                                                                                                                                                                                                                                                                                                                                                                                                            |
| verify-participant, vite build                                                 | pass; `dist/index.html` starts with the CSP and referrer meta tags                                                                                                                                                                                                                                                                                                                                                                                |
| Dev server HTML (`transformIndexHtml`)                                         | no CSP, Vite client still injected                                                                                                                                                                                                                                                                                                                                                                                                                |
| Manual check of the built app (vite preview, 127.0.0.1:3107)                   | home, offers, offer, company, persona picker, Anna's application submitted, application record with the CV PDF preview in its frame, employer "Kategoria" select (Base UI style element applied), Settings version `216d9fb (zbudowano 2026-11-11)` at 375 px without horizontal overflow; console showed **no** CSP violation. A deliberately injected inline script and an external image were blocked and reported, so the policy is enforced. |
| Export and CV downloads                                                        | not clicked manually; covered by existing browser journeys that run against the same built page in CI                                                                                                                                                                                                                                                                                                                                             |
| agent-kit example check, Playwright journeys incl. the new policy/version test | **not run locally** (Node 24 / Chromium unavailable); pending CI on PR #2                                                                                                                                                                                                                                                                                                                                                                         |
| Pages workflow                                                                 | **not run**: it activates only on `main`, and Pages must first be enabled in repository settings                                                                                                                                                                                                                                                                                                                                                  |
