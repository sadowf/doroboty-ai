import posthog from "posthog-js";

const posthogToken = import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN;
const posthogHost = import.meta.env.VITE_PUBLIC_POSTHOG_HOST;

export const isPostHogConfigured = Boolean(posthogToken && posthogHost);

if (isPostHogConfigured) {
  posthog.init(posthogToken, {
    api_host: posthogHost,
    defaults: "2026-08-30",
    // The app uses hash routes (/#/oferty). The 2026-08-30 defaults strip the hash from
    // event URLs and only capture pageviews on pathname changes, which would collapse every
    // screen into the site root. Keep hashes and capture a pageview per route change.
    capture_pageview: { path: true, hash: true },
    disable_capture_url_hashes: false,
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: false,
    },
    logs: {
      serviceName: "doroboty-ai-case-web",
      environment: import.meta.env.MODE,
    },
  });
} else if (import.meta.env.DEV && import.meta.env.MODE !== "test") {
  // Analytics is optional: participants and CI run the app without PostHog variables,
  // so a missing configuration must never stop the app from starting.
  const missingVariable = posthogToken
    ? "VITE_PUBLIC_POSTHOG_HOST"
    : "VITE_PUBLIC_POSTHOG_PROJECT_TOKEN";

  console.warn(
    `PostHog analytics is off: ${missingVariable} is not set. Copy .env.example to .env.development to send development events.`,
  );
}

export default posthog;
