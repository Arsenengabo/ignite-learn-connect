import type { PostHog } from "posthog-js";

/**
 * Crash reports and page views, sent to PostHog (audit M7).
 *
 * Privacy choices:
 * - Only page views and errors. No click autocapture, heatmaps, session recordings,
 *   surveys or feature flags.
 * - Events are not linked to anyone's name or email (no identify call).
 * - Query strings and #fragments are removed from every URL before sending. Password
 *   reset and sign-in links carry tokens there.
 * - Only runs on the published site, never in development or preview builds.
 */

// Public project key: safe to ship in browser code (it can only send events).
const POSTHOG_KEY = "phc_mRkK4pzmwfRmBb2osvEnfgzNnpsuLyMcPDaWoaJpRjbH";
const POSTHOG_HOST = "https://us.i.posthog.com";

/** Drops ?query and #fragment from any web address; other values are left alone. */
export const stripUrlSecrets = (value: unknown) => {
  if (typeof value !== "string" || !/^https?:\/\//i.test(value)) return value;
  return value.replace(/[?#].*$/, "");
};

/** Cleans every web address in an object, however deeply nested (e.g. $session_entry_url). */
const cleanUrls = (obj: Record<string, unknown>) => {
  for (const key of Object.keys(obj)) {
    const v = obj[key];
    if (typeof v === "string") obj[key] = stripUrlSecrets(v);
    else if (v && typeof v === "object" && !Array.isArray(v)) cleanUrls(v as Record<string, unknown>);
  }
};

let client: PostHog | null = null;
const early: { error: unknown; context?: Record<string, unknown> }[] = [];

/**
 * Loads PostHog after the page has appeared, so it does not slow down the first view
 * (about 125 KB compressed). Errors that happen before it loads are queued.
 */
export const startMonitoring = () => {
  if (!import.meta.env.PROD || typeof window === "undefined") return;
  // Skip Lovable's editor previews (id-preview--….lovable.app, ….lovableproject.com);
  // a site published on lovable.app or Vercel is reported.
  const host = window.location.hostname;
  if (host.startsWith("id-preview--") || host.endsWith(".lovableproject.com")) return;

  const queue = (error: unknown) => early.length < 20 && early.push({ error });
  const onError = (e: ErrorEvent) => queue(e.error ?? e.message);
  const onRejection = (e: PromiseRejectionEvent) => queue(e.reason);
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);

  const load = () =>
    import("posthog-js")
      .then(({ default: posthog }) => {
        init(posthog);
        window.removeEventListener("error", onError);
        window.removeEventListener("unhandledrejection", onRejection);
        client = posthog;
        for (const item of early.splice(0)) posthog.captureException(item.error, item.context);
      })
      .catch(() => undefined);

  const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback;
  if (idle) idle(load, { timeout: 4000 });
  else setTimeout(load, 2000);
};

const init = (posthog: PostHog) => {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: "never",
    capture_pageview: "history_change",
    capture_pageleave: false,
    capture_exceptions: true,
    autocapture: false,
    capture_heatmaps: false,
    capture_dead_clicks: false,
    rageclick: false,
    disable_session_recording: true,
    disable_surveys: true,
    advanced_disable_feature_flags: true,
    before_send: (event) => {
      if (!event) return event;
      if (event.properties) cleanUrls(event.properties);
      if (event.$set) delete event.$set;
      if (event.$set_once) delete event.$set_once;
      return event;
    },
  });
};

/** Reports an error caught by the app (e.g. by the error boundary). */
export const reportError = (error: unknown, context?: Record<string, unknown>) => {
  try {
    if (client) client.captureException(error, context);
    else if (early.length < 20) early.push({ error, context });
  } catch {
    /* never let reporting break the app */
  }
};
