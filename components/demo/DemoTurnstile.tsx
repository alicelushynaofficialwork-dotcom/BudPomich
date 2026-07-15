"use client";

import Script from "next/script";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import styles from "@/app/demo/demo.module.css";

type TurnstileApi = {
  render(container: HTMLElement, options: { sitekey: string; callback(token: string): void; "expired-callback"(): void; "error-callback"(): void; theme: "auto" }): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
};

declare global { interface Window { turnstile?: TurnstileApi } }

export type DemoTurnstileHandle = { reset(): void };
type DemoTurnstileProps = { onToken(token: string | null): void; onState(state: "loading" | "ready" | "expired" | "error"): void };

export const DemoTurnstile = forwardRef<DemoTurnstileHandle, DemoTurnstileProps>(function DemoTurnstile({ onToken, onState }, ref) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | undefined>(undefined);
  const [scriptReady, setScriptReady] = useState(false);

  const renderWidget = useCallback(() => {
    if (!siteKey || !containerRef.current || !window.turnstile || widgetIdRef.current) return;
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme: "auto",
      callback(token) { onToken(token); onState("ready"); },
      "expired-callback"() { onToken(null); onState("expired"); },
      "error-callback"() { onToken(null); onState("error"); },
    });
  }, [onState, onToken, siteKey]);

  useImperativeHandle(ref, () => ({ reset() {
    onToken(null);
    if (widgetIdRef.current && window.turnstile) window.turnstile.reset(widgetIdRef.current);
    onState("loading");
  } }), [onState, onToken]);

  useEffect(() => { if (scriptReady) renderWidget(); }, [renderWidget, scriptReady]);
  useEffect(() => () => {
    if (widgetIdRef.current && window.turnstile) window.turnstile.remove(widgetIdRef.current);
    widgetIdRef.current = undefined;
    onToken(null);
  }, [onToken]);

  if (!siteKey) return null;
  return <div className={styles.turnstileWidget}>
    <div ref={containerRef} />
    <Script id="cloudflare-turnstile-demo" onError={() => onState("error")} onReady={() => setScriptReady(true)} src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" />
  </div>;
});
