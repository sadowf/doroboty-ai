import posthog, { isPostHogConfigured } from "./posthog";

type LogAttributes = Record<string, boolean | number | string>;

/** Sends only purpose-written application logs to PostHog. */
export const posthogLogger = {
  info(message: string, attributes: LogAttributes = {}) {
    if (isPostHogConfigured) posthog.logger.info(message, attributes);
  },
  warn(message: string, attributes: LogAttributes = {}) {
    if (isPostHogConfigured) posthog.logger.warn(message, attributes);
  },
  error(message: string, attributes: LogAttributes = {}) {
    if (isPostHogConfigured) posthog.logger.error(message, attributes);
  },
};
