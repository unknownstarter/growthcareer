/**
 * GA4 gtag wrapper. SSR safe.
 *
 * GA4 is initialized via @next/third-parties GoogleAnalytics in
 * app/[locale]/layout.tsx, which injects the global `gtag` function on the
 * client. We never reference it during SSR.
 */

export type GtagEventParams = Record<string, string | number | boolean>;

export type GtagEvent = {
  event_name: string;
  parameters: GtagEventParams;
};

declare global {
  interface Window {
    gtag?: (
      command: "event" | "config" | "set",
      target: string,
      params?: GtagEventParams,
    ) => void;
  }
}

export function trackEvent({ event_name, parameters }: GtagEvent): void {
  if (typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;
  window.gtag("event", event_name, parameters);
}
