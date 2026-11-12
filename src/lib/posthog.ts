import posthog from "posthog-js";

const posthogToken = import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN;
const posthogHost = import.meta.env.VITE_PUBLIC_POSTHOG_HOST;

export const isPostHogConfigured = Boolean(posthogToken && posthogHost);

if (isPostHogConfigured) {
  posthog.init(posthogToken, {
    api_host: posthogHost,
    defaults: "2026-08-30",
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
} else if (import.meta.env.DEV) {
  const missingVariable = posthogToken
    ? "VITE_PUBLIC_POSTHOG_HOST"
    : "VITE_PUBLIC_POSTHOG_PROJECT_TOKEN";

  throw new Error(
    `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`,
  );
}

export default posthog;
