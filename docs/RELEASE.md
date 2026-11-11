# Release, smoke check, rollback and outage procedure

Owner of the published participant site: **sadowf** (decides on rollback, informs participants). Audience: AIPH3 participants, about 20 at the same time. An outage blocks a class, so the local fallback below must stay usable.

The app is a static build: no server, database, accounts or secrets. Every participant's data lives only in their own browser (localStorage). Publishing replaces files; it never touches participant data. A rollback restores files only.

Provider choice is still open (Netlify or GitHub Pages). Provider configuration files are not added yet; this document describes both.

## 1. Before publishing

1. Work from a clean branch whose commit you can name (`git log --oneline -1`).
2. Run the full gate on Node 24: `./scripts/verify` (or `npm run check`). On the owner's Windows machine the browser journeys cannot run locally; use the CI result for the same commit instead (open a pull request — CI runs on pull requests and on pushes to `main`).
3. Note the commit hash. It is the release identity; the provider shows it next to each deploy.

Build used by every provider:

| Setting          | Value                                      |
| ---------------- | ------------------------------------------ |
| Node             | 24 (from `.nvmrc`)                         |
| Install          | `npm ci`                                   |
| Build command    | `npm run build`                            |
| Published folder | `dist/`                                    |
| Environment vars | none required — do not add secrets         |
| Routing          | hash routes (`/#/…`); no rewrites needed   |
| Sub-path hosting | supported (`base: "./"` in vite.config.ts) |

Never open `dist/index.html` from disk (`file://`); ES modules need HTTP.

## 2. Publishing

### Netlify

1. Netlify → **Add new project** (older UI: "Add new site") → import the GitHub repository `sadowf/doroboty-ai`.
2. Branch to deploy: the release branch (normally `main`). Build command `npm run build`, publish directory `dist`.
3. After the deploy finishes, open the deploy's detail page and record its commit and URL.

Free plan note (checked 2026-11-11): the Free plan is credit-based (300 credits/month, hard limit, no charges). Web bandwidth costs credits per GB and production deploys also use credits; when the monthly limit is reached the site **pauses until the next cycle**. One full first load is about 2.5 MB, so 20 participants use well under 1 GB per class — but avoid many unnecessary production deploys right before a class. Check usage in the Netlify team's billing/usage page after the first class.

### GitHub Pages

1. The repository is public, so Pages is available on the free plan.
2. Repository **Settings → Pages → Build and deployment → Source: GitHub Actions**, then add a workflow that runs `npm ci`, `npm run build` and deploys `dist/` with the official `actions/upload-pages-artifact` and `actions/deploy-pages` actions (to be added as a separate change once this provider is chosen).
3. The site URL is `https://sadowf.github.io/doroboty-ai/` (sub-path is supported).

Limits (checked 2026-11-11): published site up to 1 GB, soft bandwidth limit 100 GB/month, deploy timeout 10 minutes. Expected use is far below these.

## 3. Five-minute smoke check (right after every publication)

Who: the owner (sadowf). Use a fresh private browser window so no old local data interferes.

1. Open the site URL. The address bar shows `https://` and a padlock; `http://` redirects to `https://`.
2. The deploy shown by the provider has the commit hash you intended to publish.
3. Choose **Anna Kowalska**, open an offer, send an application with a short synthetic answer and approval.
4. Choose **Karolina Wiśniewska**, open **Kandydaci**, open Anna's application and move it to **W przeglądzie**.
5. Reload the page. The stage history still shows the change.
6. Open **Profil** as Anna and download the CV PDF; it opens as a PDF.
7. Copy a deep link (for example `…/#/oferty/ai-product-manager`), open it in a new tab: the same offer appears.
8. Open the browser developer tools console: no red errors during steps 3–7.

**Rollback condition:** if any of steps 1–7 fails and cannot be explained by your own browser, roll back (section 4) before participants use the site. Then record the failure in a task note.

## 4. Rollback

### Netlify

1. Open the project → **Deploys**.
2. Select the last deploy that passed the smoke check → **Publish deploy**. This is instantaneous, does not build anything and does not use credits.
3. Optionally lock publishing so the next push does not replace it automatically, until a fix is ready.
4. Run the smoke check again on the restored deploy.

### GitHub Pages

1. Preferred: revert the faulty commit on the publishing branch (`git revert <hash>`), push, and wait for the Pages workflow to finish.
2. Alternative: in **Actions**, open the Pages workflow run of the last good commit and re-run it.
3. Run the smoke check again.

Data note: rollback cannot change what participants already saved in their browsers. Saves use one versioned key (`doroboty.prototype.v1`). If a release changes the data model, review migration and backward compatibility before publishing, because an older version may refuse a newer save (it will show the recovery message instead of overwriting it).

## 5. When the site does not work (outage procedure)

1. **Confirm**: open the URL in a private window and on another network (for example a phone on mobile data). Check the provider's status page and the latest deploy log.
2. **If the last deploy is the cause**: roll back (section 4).
3. **If the provider is down or the site is paused** (for example Netlify credits exhausted): tell participants to use the local fallback below; the class can continue.
4. **Tell participants** in the course channel what happened, what to use meanwhile and that their data stays in their browser.
5. **Afterwards** record what happened, the cause and the fix in `docs/tasks/`.

### Local fallback for participants (same app, no hosting)

Requirements: Node.js 24 and npm, plus the participant package or a repository checkout.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3001. Local data at this address is separate from the published site. To move a scenario between the two, use **Ustawienia → eksport** in one and **import** in the other.

### Problems participants can solve themselves

- **"Coś poszło nie tak" screen**: reload; if it repeats, download the data copy and restore the starting data from that screen, then report the screen and the last click (no personal data).
- **"Dane scenariusza zmieniono w innej karcie"**: click **Wczytaj aktualne dane**, and keep only one editing tab open.
- **"Nie udało się odczytać zapisu"**: open Ustawienia, download the previous save, then import a valid file or reset the scenario.
