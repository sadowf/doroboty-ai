# Participant guide

## Start

Use the prepared baseline package and Node.js 24 with npm.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3001. If Node or registry access is blocked by your organization, ask your instructor/IT rather than bypassing the policy.

## Try a complete flow

1. Choose Anna Kowalska and browse offers.
2. Save an offer, edit the profile and submit an approved application. Source notes and the editable proposal are separate.
3. Choose Karolina Wiśniewska for BrightLabs and review its candidates.
4. Record review, invitation, conversation and the next decision.
5. Return to Anna and inspect the application history.

Karolina and Tomasz see their respective companies in the interface; this is role simulation. All data is local and synthetic. CVs are prepared text examples, not real uploads. AI proposals and scores simulate the scenario.

## Save, share and recover

Changes survive reload in this browser. Settings can export a JSON file, import a scenario or reset to fixtures. Import/reset asks before replacing state. If a save is incompatible, download the original before resetting. Storage failure is shown explicitly; export before closing the tab. Use one editing tab at a time; if another tab saved changes, choose “Wczytaj aktualne dane” before continuing. If a screen shows “Coś poszło nie tak”, reload first; if it repeats, download the data copy and restore the starting data from that screen. If the published site is unavailable, run the app locally as in Start and move data with export/import.

A URL shares the interface, not your local changes. To transfer a scenario, share the exported file and import it in the other browser. Exports include all personas, applications and notes; never enter real personal data.

## Static build

Run npm run build. Serve dist/ through any static HTTP host. No provider account is needed for local development. Do not open index.html via file://; ES modules need HTTP. Hash links work without route rewrite configuration.

## Verification

Run ./scripts/verify or npm run check. Browser tests require provisioned Playwright Chromium; a missing test browser does not prevent npm run dev. Do not let an agent install system dependencies automatically.
