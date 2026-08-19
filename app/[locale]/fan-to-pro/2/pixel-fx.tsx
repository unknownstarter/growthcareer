"use client";

/* 픽셀 인터랙션 client 아일랜드 — 스크롤 트리거(IntersectionObserver) + steps.
   glow/gradient 금지(CLAUDE §6.8). reduced-motion 시 즉시 최종 상태. */
import { useEffect, useRef, useState } from "react";
import styles from "./glass.module.css";

type Course = {
  slug: string;
  title: string;
  meta: string;
  status: "confirmed" | "pending";
  price: number | null;
};

function krw(n: number) {
  return `₩${n.toLocaleString("en-US")}`;
}

/** 과정 선택 — 올인원 vs 단과 골라듣기. 헷갈림 방지: 2갈래 명확 + 실시간 요약 + 안내문.
   결제는 계좌이체 수동. 선택 slug 배열을 신청과 함께 전달(간이 정책 B). 픽셀/터미널 컨셉. */
type ApplyT = {
  selectCmd: string;
  allLabel: string;
  allHint: string;
  pickLabel: string;
  pickHint: string;
  allInOneTag: string;
  allInOneHint: string;
  prep: string;
  tbd: string;
  allInOnePrice: number;
  nudge: string;
  allCoursesApplied: string;
  pickedAll: string;
  pickedN: string;
  submit: string;
  guide: string;
};

export function CourseSelector({
  courses,
  t,
  mode,
  picked,
  onMode,
  onToggle,
}: {
  courses: Course[];
  t: ApplyT;
  mode: "all" | "pick";
  picked: string[];
  onMode: (m: "all" | "pick") => void;
  onToggle: (slug: string) => void;
}) {
  const pickedCourses = courses.filter((c) => picked.includes(c.slug));
  const allPriced = pickedCourses.length > 0 && pickedCourses.every((c) => c.price != null);
  const sumTotal = allPriced ? pickedCourses.reduce((s, c) => s + (c.price ?? 0), 0) : null;

  // 단과에서 전 과정을 다 고르면 올인원과 동일 = 올인원가 적용 (노아 스펙, apply-flow
  // 의 effectiveMode 와 동일 판정). 합산가(110만) 대신 올인원가(99만)를 요약에 표시.
  const isAllCourses = picked.length === courses.length && picked.length > 0;
  const total = isAllCourses ? t.allInOnePrice : sumTotal;

  const RadioPill = ({ v, label, hint }: { v: "all" | "pick"; label: string; hint: string }) => {
    const active = mode === v;
    return (
      <button
        type="button"
        onClick={() => onMode(v)}
        aria-pressed={active}
        className={`${styles.pixelBorder} flex flex-1 items-center gap-3 p-4 text-left transition-colors ${
          active ? "bg-brand-pink/10" : "bg-bg hover:bg-surface"
        }`}
        style={active ? { borderColor: "var(--color-brand-pink)" } : undefined}
      >
        <span className={`${styles.mono} font-bold text-brand-pink`}>{active ? "◉" : "○"}</span>
        <span>
          <span className={`${styles.pixelFont} block text-base`}>{label}</span>
          <span className="block text-fg-subtle text-xs">{hint}</span>
        </span>
      </button>
    );
  };

  return (
    <div className={`${styles.pixelBorder} bg-bg`}>
      {/* 윈도우 바 */}
      <div className={styles.windowBar}>
        <span className={styles.winDot} style={{ background: "#ec4899" }} />
        <span className={styles.winDot} style={{ background: "#a855f7" }} />
        <span className={styles.winDot} style={{ background: "#6366f1" }} />
        <span className="ml-2 text-fg-muted">{t.selectCmd}</span>
      </div>

      <div className="p-6 sm:p-8">
        {/* 2갈래 토글 */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <RadioPill v="all" label={t.allLabel} hint={t.allHint} />
          <RadioPill v="pick" label={t.pickLabel} hint={t.pickHint} />
        </div>

        {/* 본문 */}
        {mode === "all" ? (
          <div className={`${styles.pixelBorder} mt-5 bg-surface p-6`}>
            <div className="mb-4 flex items-center gap-2">
              <span className={`${styles.termTag} text-brand-pink`}>{t.allInOneTag}</span>
              <span className="text-fg-subtle text-xs">{t.allInOneHint}</span>
            </div>
            <ul className="space-y-2 text-fg text-sm">
              {courses.map((c) => (
                <li key={c.slug} className="flex items-center gap-2">
                  <span className={`${styles.mono} text-brand-pink`}>+</span>
                  <span className={c.status === "pending" ? "text-fg-subtle" : ""}>{c.title}</span>
                  {c.status === "pending" ? (
                    <span className="text-fg-subtle text-xs">{t.prep}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="mt-5 space-y-2">
            {courses.map((c) => {
              const on = picked.includes(c.slug);
              const disabled = c.status === "pending";
              return (
                <button
                  type="button"
                  key={c.slug}
                  disabled={disabled}
                  onClick={() => !disabled && onToggle(c.slug)}
                  className={`${styles.pixelBorder} flex w-full items-center gap-3 p-4 text-left transition-colors ${
                    disabled
                      ? "cursor-not-allowed opacity-45"
                      : on
                        ? "bg-brand-pink/10"
                        : "bg-surface hover:bg-bg"
                  }`}
                  style={on ? { borderColor: "var(--color-brand-pink)" } : undefined}
                >
                  <span className={`${styles.mono} font-bold text-brand-pink text-sm`}>
                    {disabled ? "[ ]" : on ? "[x]" : "[ ]"}
                  </span>
                  <span className="flex-1">
                    <span className="block font-bold text-fg">{c.title}</span>
                    <span className="block text-fg-subtle text-xs">{c.meta}</span>
                  </span>
                  <span className={`${styles.mono} text-fg-subtle text-xs`}>
                    {c.price != null ? krw(c.price) : t.tbd}
                  </span>
                </button>
              );
            })}
            {isAllCourses ? (
              <p className={`${styles.mono} pt-1 text-brand-pink text-xs`}>
                {`// ${t.allCoursesApplied}`}
              </p>
            ) : sumTotal != null && sumTotal > t.allInOnePrice ? (
              <p className={`${styles.mono} pt-1 text-brand-pink text-xs`}>
                {t.nudge}
              </p>
            ) : null}
          </div>
        )}

        {/* 요약 (제출은 아래 신청서 폼에서). 단과에서 전 과정 선택 = 올인원 취급. */}
        <div className="mt-6 border-border border-t pt-5">
          <p className={`${styles.mono} text-fg-subtle text-xs`}>
            {mode === "all" || isAllCourses
              ? t.pickedAll
              : t.pickedN.replace("{n}", String(picked.length))}
          </p>
          <p className={`${styles.pixelFont} mt-1 text-2xl text-fg`}>
            {mode === "all" ? krw(t.allInOnePrice) : total != null ? krw(total) : t.tbd}
          </p>
          {mode === "pick" && isAllCourses ? (
            <p className="mt-1.5 text-brand-pink text-xs">{t.allCoursesApplied}</p>
          ) : null}
        </div>

        {/* 안내문 */}
        <p className="mt-5 text-fg-subtle text-xs leading-relaxed">{t.guide}</p>
      </div>
    </div>
  );
}

/** 픽셀 스켈레톤 이미지 — 로드 전 shimmer, 로드 후 fade-in. lazy. (Storage URL, 이미 최적화됨) */
export function PixelImage({
  src,
  alt = "",
  className = "",
  sizes,
}: {
  src: string;
  alt?: string;
  className?: string;
  sizes?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!loaded && <span aria-hidden className={styles.skeleton} />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        sizes={sizes}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={`relative z-[2] h-full w-full object-cover transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}

/** 픽셀 스켈레톤 영상 — 뷰포트 근접 시에만 mount(lazy), canplay 전 shimmer. muted 자동 루프. */
export function PixelVideo({
  src,
  poster,
  className = "",
  label,
}: {
  src: string;
  poster?: string;
  className?: string;
  label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      {!ready && <span aria-hidden className={styles.skeleton} />}
      {near && (
        <video
          className={`relative z-[2] h-full w-full object-cover transition-opacity duration-300 ${
            ready ? "opacity-100" : "opacity-0"
          }`}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={poster}
          onCanPlay={() => setReady(true)}
        >
          <source src={src} type="video/mp4" />
        </video>
      )}
      {label ? (
        <span
          className={`${styles.mono} absolute bottom-3 left-3 z-[3] bg-bg/70 px-2 py-1 text-brand-pink text-xs`}
        >
          {label}
        </span>
      ) : null}
    </div>
  );
}

/** GNB 로고 부팅 타이핑 — 첫 방문 1회(sessionStorage). reduced-motion/재방문 = 즉시 완성. */
export function BootLogo() {
  const full = "Fan to Pro";
  const [shown, setShown] = useState(full);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    try {
      if (sessionStorage.getItem("f2p_booted")) return;
      sessionStorage.setItem("f2p_booted", "1");
    } catch {
      return;
    }
    setShown("");
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(full.slice(0, i));
      if (i >= full.length) clearInterval(id);
    }, 60);
    return () => clearInterval(id);
  }, []);
  return (
    <span className={`${styles.pixelFont} text-base`}>
      {shown}
      <span className={styles.blink} aria-hidden>
        _
      </span>
    </span>
  );
}

/** 스탯 카운트업 — 숫자 접두부만 steps 로 탁탁 올림. 숫자 없으면 정적. */
export function StatCountUp({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const m = value.match(/^(\d+)(.*)$/);
  const target = m ? Number.parseInt(m[1], 10) : null;
  const suffix = m ? m[2] : value;
  const [n, setN] = useState<number>(0);
  useEffect(() => {
    if (target === null) return;
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(target);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const steps = Math.min(target, 18);
            let i = 0;
            const id = setInterval(() => {
              i += 1;
              setN(steps === 0 ? target : Math.round((target * i) / steps));
              if (i >= steps) {
                setN(target);
                clearInterval(id);
              }
            }, 55);
            io.disconnect();
          }
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [target]);
  return <span ref={ref}>{target === null ? value : `${n}${suffix}`}</span>;
}

/** GNB 하단 스크롤 진행 픽셀 게이지 (점선 픽셀, blur bar 아님). */
export function ScrollProgress() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setPct(max > 0 ? Math.min(100, (h.scrollTop / max) * 100) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  return (
    <div
      className={styles.scrollGauge}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="페이지 스크롤 진행도"
      style={{ backgroundSize: `${pct}% 100%` }}
    />
  );
}

type EligItem = { title: string; body: string; chips: readonly string[] };

/** 지원조건 체크리스트 — 스크롤 진입 시 [ ]→[x] 순차 자가 체크. */
export function EligibilityChecklist({
  items,
  checkingLabel,
  passedLabel,
}: {
  items: readonly EligItem[];
  checkingLabel: string;
  passedLabel: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [checked, setChecked] = useState<boolean[]>(() => items.map(() => false));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setChecked(items.map(() => true));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            items.forEach((_, i) =>
              setTimeout(() => {
                setChecked((c) => {
                  const n = [...c];
                  n[i] = true;
                  return n;
                });
              }, i * 220),
            );
            io.disconnect();
          }
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [items]);

  const allDone = checked.every(Boolean);

  return (
    <div ref={ref}>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((e, i) => (
          <article
            key={e.title}
            className={`${styles.pixelBorder} ${styles.pixelShadowLift} ${
              checked[i] ? styles.checkFlash : ""
            } bg-bg p-7`}
          >
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className={`${styles.mono} shrink-0 font-bold text-sm ${
                  checked[i] ? "text-brand-pink" : "text-fg-subtle"
                }`}
              >
                {checked[i] ? "[x]" : "[ ]"}
              </span>
              <div className="min-w-0">
                <h3 className="font-bold text-fg text-lg">{e.title}</h3>
                <p className="mt-2 text-fg-muted text-sm leading-relaxed">{e.body}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {e.chips.map((ch) => (
                    <span
                      key={ch}
                      className="border border-border px-2 py-0.5 text-fg-subtle text-xs"
                    >
                      {ch}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
      <p
        className={`${styles.mono} mt-6 text-xs ${
          allDone ? "text-brand-pink" : "text-fg-subtle"
        }`}
        aria-hidden
      >
        {allDone ? passedLabel : checkingLabel}
        <span className={styles.blink}>_</span>
      </p>
    </div>
  );
}
