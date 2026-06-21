"use client";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { PRICING, formatKRW } from "@/src/programs/fan-to-pro/domain/pricing";
import { isEnrollmentClosed } from "@/src/programs/fan-to-pro/domain/program";
import { Button } from "../ui/button";
import { Container } from "../ui/container";

export function StickyCTA() {
  const t = useTranslations("stickyCta");
  const locale = useLocale();
  const [scrolled, setScrolled] = useState(false);
  const [applyInView, setApplyInView] = useState(false);
  const [closed, setClosed] = useState(() => isEnrollmentClosed());

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const target = document.getElementById("apply");
    if (!target || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setApplyInView(entry.isIntersecting),
      { rootMargin: "0px 0px -20% 0px", threshold: 0 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  // 자정 넘어가는 사용자 커버 — 30초마다 재확인.
  useEffect(() => {
    if (closed) return;
    const interval = setInterval(() => {
      if (isEnrollmentClosed()) setClosed(true);
    }, 30_000);
    return () => clearInterval(interval);
  }, [closed]);

  const show = scrolled && !applyInView;

  return (
    <div
      aria-hidden={!show}
      className={`fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ${
        show ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="border-t border-border bg-bg/95 backdrop-blur">
        <Container>
          <div className="flex items-center justify-between gap-3 py-3 sm:py-4">
            <div className="hidden sm:block">
              <p
                className="text-fg-subtle text-[10px] uppercase whitespace-nowrap"
                style={{ letterSpacing: "0.3em" }}
              >
                {closed ? t("scarcityClosed") : t("scarcity")}
              </p>
              <p className="font-black text-fg text-lg sm:text-xl">
                {closed ? (
                  t("closedValue")
                ) : (
                  <>
                    {formatKRW(PRICING.discounted, locale)}
                    <span className="ml-2 text-xs font-normal text-fg-subtle sm:text-sm">
                      {t("vatNote")}
                    </span>
                  </>
                )}
              </p>
            </div>
            <Button
              href="#apply"
              variant="primary"
              size="lg"
              className="ml-auto w-full sm:w-auto"
            >
              {closed ? t("ctaClosed") : t("cta")}
            </Button>
          </div>
        </Container>
      </div>
    </div>
  );
}
