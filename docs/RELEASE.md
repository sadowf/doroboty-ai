# Release, smoke check, rollback and outage procedure

Owner of the published participant site: **sadowf** (decides on rollback, informs participants). Audience: AIPH3 participants, about 20 at the same time. An outage blocks a class, so the local fallback below must stay usable.

The app is a static build: no server, database, accounts or secrets. Every participant's data lives only in their own browser (localStorage). Publishing replaces files; it never touches participant data. A rollback restores files only.

Hosting: **GitHub Pages** (chosen by sadowf on 2026-11-11), published by [.github/workflows/pages.yml](../.github/workflows/pages.yml). Site address: `https://sadowf.github.io/doroboty-ai/`.

## 1. How publication works

1. A change reaches `main` (normally by merging a pull request).
2. The **CI** workflow runs the full gate (`./scripts/verify` on Node 24, including browser journeys) for that push.
3. Only if CI succeeded, **Publish to GitHub Pages** checks out exactly that commit, runs `npm ci` and `npm run build`, and deploys `dist/`. A failed CI run publishes nothing; the previous site stays online.
4. The build records its short commit hash and build date. Participants see them in **Ustawienia → O prototypie** ("Wersja aplikacji") and on the error screen. This is the release identity used in the smoke check and in problem reports.

Build used by the workflow (and for a manual local build):

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

### One-time setup (owner)

1. Repository **Settings → Pages → Build and deployment → Source: GitHub Actions**. Nothing else is needed: no branch, no custom domain, no secrets.
2. The workflow only becomes active once `.github/workflows/pages.yml` is on `main` (GitHub reads `workflow_run` workflows from the default branch). The first publication happens with the first successful CI run on `main` after that, or by running **Actions → Publish to GitHub Pages → Run workflow** on `main`.
3. Settings → Pages shows "Your site is live at …" after the first deployment. Leave **Enforce HTTPS** on (it is always on for `github.io` addresses).

Limits (checked 2026-11-11): published site up to 1 GB, soft bandwidth limit 100 GB/month, deploy timeout 10 minutes. One full first load is about 2.5 MB, so 20 participants stay far below these.

### Security policy on a static host

GitHub Pages cannot send custom response headers. The production build therefore declares, in `index.html`, a `Content-Security-Policy` (scripts, connections and frames only from the site itself, no plugins, no external images or fonts; inline styles allowed because the select list injects a small style element) and `referrer: no-referrer`. The development server is not affected. Protection against embedding the site in another page (`frame-ancestors`, `X-Frame-Options`) is not available on GitHub Pages; this is accepted because the app has no accounts, secrets or server actions.

## 2. Before merging to `main`

1. Open a pull request; CI must be green for its latest commit.
2. Note the commit you expect to publish (`git log --oneline -1` on `main` after merging).
3. Avoid merging right before a class: if the smoke check fails, you need a few minutes to roll back.

## 3. Five-minute smoke check (right after every publication)

Who: the owner (sadowf). Use a fresh private browser window so no old local data interferes.

1. Open `https://sadowf.github.io/doroboty-ai/`. The address bar shows `https://` and a padlock.
2. Open **Ustawienia** (`…/#/app/settings`): "Wersja aplikacji" shows the commit you expected (first 7 characters) and today's build date. The Actions run of **Publish to GitHub Pages** shows the same commit.
3. Choose **Anna Kowalska**, open an offer, send an application with a short synthetic answer and approval.
4. Choose **Karolina Wiśniewska**, open **Kandydaci**, open Anna's application and move it to **W przeglądzie**.
5. Reload the page. The stage history still shows the change.
6. Open **Profil** as Anna and download the CV PDF; it opens as a PDF.
7. Copy a deep link (for example `…/#/oferty/ai-product-manager`), open it in a new tab: the same offer appears.
8. Open the browser developer tools console: no red errors (in particular no "Content Security Policy" messages) during steps 3–7.

**Rollback condition:** if any of steps 1–7 fails and cannot be explained by your own browser, roll back (section 4) before participants use the site. Then record the failure in a task note.

## 4. Rollback

1. Fastest: **Actions → Publish to GitHub Pages**, open the run of the last commit that passed the smoke check → **Re-run all jobs**. It rebuilds and redeploys exactly that commit (about two minutes).
2. Then fix forward or revert the faulty commit on `main` (`git revert <hash>` in a pull request). Until that lands, do not re-run the Pages workflow on `main`, and remember that the next successful CI push to `main` publishes again.
3. Run the smoke check again and confirm "Wersja aplikacji" shows the restored commit.

Data note: rollback cannot change what participants already saved in their browsers. Saves use one versioned key (`doroboty.prototype.v1`). If a release changes the data model, review migration and backward compatibility before publishing, because an older version may refuse a newer save (it will show the recovery message instead of overwriting it).

## 5. When the site does not work (outage procedure)

1. **Confirm**: open the URL in a private window and on another network (for example a phone on mobile data). Check [githubstatus.com](https://www.githubstatus.com/) (Pages and Actions) and the latest Pages workflow run.
2. **If the last publication is the cause**: roll back (section 4).
3. **If GitHub Pages is down**: tell participants to use the local fallback below; the class can continue.
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

- **"Coś poszło nie tak" screen**: reload; if it repeats, download the data copy and restore the starting data from that screen, then report the screen, the last click and the "Wersja aplikacji" shown there (no personal data).
- **"Dane scenariusza zmieniono w innej karcie"**: click **Wczytaj aktualne dane**, and keep only one editing tab open.
- **"Nie udało się odczytać zapisu"**: open Ustawienia, download the previous save, then import a valid file or reset the scenario.

## Alternative provider (not configured)

Netlify was the other candidate. It could send real security headers and offers instant one-click rollback, but its Free plan (checked 2026-11-11) is credit-based and pauses the site until the next month when credits run out. Switching would need its own build settings and a new smoke check; it is not prepared in this repository.
