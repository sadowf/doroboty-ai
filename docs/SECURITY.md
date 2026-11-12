# Prototype data boundary

This static frontend has no trusted server or real authentication. Role-specific UI and local transition checks organize the scenario; anyone using the browser can inspect all stored data. Use synthetic data only.

No API keys, credentials, real CVs or private material belong in frontend source, JSON, localStorage or exports. The PostHog project token (`phc_…`) is a public, write-only browser key and the only allowed exception; keep it in a gitignored `.env.development` locally and in repository Actions variables for publication, never in source. Analytics events must not carry free text typed by people; the SDK never captures input values. Exports include private-in-the-UI source/recruiter notes.

Render imported text through React text nodes, validate imports with shared Zod schemas, reject unsupported versions, duplicate IDs, broken references and oversized files. Never overwrite an unreadable save automatically.

The published build (GitHub Pages) cannot set HTTP security headers. It declares a Content-Security-Policy meta tag instead: scripts, connections and frames only from the site itself, no plugins, inline styles allowed for the UI library. When the build has PostHog variables, the policy also allows `https://*.<PostHog domain>` (for example `*.posthog.com`) for scripts, connections and workers, because the analytics SDK loads its extensions from PostHog. Keep the app free of inline scripts and other remote runtime resources so the policy stays strict. Embedding protection (`frame-ancestors`) is not available on this host.
