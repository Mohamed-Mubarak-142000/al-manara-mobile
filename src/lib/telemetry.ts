import * as Sentry from "@sentry/react-native";
import PostHog from "posthog-react-native";

/**
 * Crash reporting (Sentry) and product analytics (PostHog), each switched on only when its key is
 * set (EXPO_PUBLIC_SENTRY_DSN, EXPO_PUBLIC_POSTHOG_KEY); without keys every call is a no-op. No
 * personal data is sent: no email or name, only anonymous events and screen names.
 */

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

export const sentryEnabled = !!SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
  });
}

const posthog = POSTHOG_KEY
  ? new PostHog(POSTHOG_KEY, { host: POSTHOG_HOST, captureAppLifecycleEvents: true, personProfiles: "never" })
  : null;

export type AppEvent =
  | "khatma_started"
  | "khatma_day_read"
  | "khatma_adopted"
  | "plan_created"
  | "tasmee_finished"
  | "exam_submitted"
  | "surah_downloaded"
  | "donation_submitted"
  | "onboarding_finished"
  | "onboarding_skipped";

export function track(event: AppEvent, properties?: Record<string, string | number | boolean>) {
  posthog?.capture(event, properties);
}

export function trackScreen(pathname: string) {
  posthog?.screen(pathname);
}

/** Wraps the root component for Sentry's error boundary and touch breadcrumbs, when enabled. */
export function withTelemetry(component: React.ComponentType): React.ComponentType {
  return sentryEnabled ? (Sentry.wrap(component as React.ComponentType<Record<string, unknown>>) as React.ComponentType) : component;
}
