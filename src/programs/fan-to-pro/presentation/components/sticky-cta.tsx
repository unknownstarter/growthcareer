"use client";
import { useEffect, useState } from "react";
import { PRICING, formatKRW } from "@/src/programs/fan-to-pro/domain/pricing";
import { Button } from "../ui/button";
import { Container } from "../ui/container";

export function StickyCTA() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
                className="text-fg-subtle text-[10px] uppercase"
                style={{ letterSpacing: "0.3em" }}
              >
                선착순 마감
              </p>
              <p className="font-black text-fg text-lg sm:text-xl">
                {formatKRW(PRICING.discounted)}
                <span className="ml-2 text-xs font-normal text-fg-subtle sm:text-sm">
                  VAT 포함
                </span>
              </p>
            </div>
            <Button
              href="#apply"
              variant="primary"
              size="lg"
              className="ml-auto w-full sm:w-auto"
            >
              지금 신청 →
            </Button>
          </div>
        </Container>
      </div>
    </div>
  );
}
