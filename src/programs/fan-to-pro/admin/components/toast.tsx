"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/src/programs/fan-to-pro/presentation/components/cn";

/**
 * 최소 토스트 시스템 - 외부 의존성 없음.
 *
 * a11y: 컨테이너에 role="status" + aria-live="polite". 추가 dom 추가 시 스크린리더에 알림.
 *       에러 토스트는 role="alert" + aria-live="assertive" 로 즉시 안내.
 */

type Tone = "success" | "error" | "info";

type Toast = {
  id: number;
  tone: Tone;
  message: string;
};

type ToastContext = {
  show: (message: string, tone?: Tone) => void;
};

const Ctx = createContext<ToastContext | null>(null);

let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setItems((curr) => curr.filter((t) => t.id !== id));
    const handle = timers.current.get(id);
    if (handle) {
      clearTimeout(handle);
      timers.current.delete(id);
    }
  }, []);

  const show = useCallback<ToastContext["show"]>(
    (message, tone = "info") => {
      counter += 1;
      const id = counter;
      setItems((curr) => [...curr, { id, message, tone }]);
      const handle = setTimeout(() => dismiss(id), 4000);
      timers.current.set(id, handle);
    },
    [dismiss],
  );

  useEffect(
    () => () => {
      timers.current.forEach((h) => clearTimeout(h));
      timers.current.clear();
    },
    [],
  );

  const value = useMemo(() => ({ show }), [show]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto max-w-sm border px-4 py-3 text-sm shadow-lg",
              "animate-in fade-in slide-in-from-bottom-2 duration-150",
              t.tone === "success" &&
                "border-emerald-500/60 bg-emerald-500/10 text-emerald-200",
              t.tone === "error" &&
                "border-brand-pink bg-brand-pink/10 text-brand-pink",
              t.tone === "info" &&
                "border-border bg-surface-elevated text-fg",
            )}
            onClick={() => dismiss(t.id)}
          >
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastContext {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useToast must be used within <ToastProvider>");
  }
  return ctx;
}
