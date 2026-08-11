import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Space_Mono } from "next/font/google";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/src/i18n/routing";
import {
  PRESS_ARTICLES,
  pressDesc,
  pressTitle,
} from "@/src/programs/growth-career/domain/press";
import { SiteFooter } from "@/src/shared/navigation/site-footer";
import { SiteHeader } from "@/src/shared/navigation/site-header";
import { GcWordmark } from "@/src/shared/navigation/gc-wordmark";
import { GcHeaderCta } from "@/src/shared/navigation/gc-header-cta";
import { Button } from "@/src/shared/ui/button";
import { StickyCtaBar } from "@/src/shared/ui/sticky-cta-bar";
import {
  gcFooterNav,
  gcNavAfter,
  gcNavBefore,
} from "@/src/programs/growth-career/presentation/gc-nav";
import { CommunityGate } from "@/app/[locale]/gc-preview/community-gate";
import styles from "./glass.module.css";
import { getContent } from "./content";
import {
  EligibilityChecklist,
  PixelImage,
  PixelVideo,
  ScrollProgress,
  StatCountUp,
} from "./pixel-fx";
import { ApplyFlow } from "./apply-flow";

/* =============================================================================
   Fan to Pro (K-ent) 2기 모집 — 에버그린 슬롯 (/fan-to-pro = 현재 열린 기수).
   픽셀/터미널 컨셉. 이중언어: [locale] 라우트라 layout LocaleSwitcher(/ko↔/en)에 반응.
   문자열은 content.ts. 전역 globals.css 안 건드림 (라이브 회귀 방지 §7.4).
   미디어는 Supabase Storage. 1기는 /fan-to-pro/1 에 영구 보존.
   ============================================================================= */

const pixelMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-pixel-mono",
  display: "swap",
});

const SITE_URL = "https://growthcareer.xyz";

type Params = { locale: string };

// 시간 기반 (모집 오픈/마감) 전환 — request-time 평가 강제 (SSG cache 회피, §7).
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations({ locale, namespace: "meta.fanToPro" });
  const ogLocale = locale === "ko" ? "ko_KR" : "en_US";
  // 에버그린 슬롯 = 현재 열린 기수. self-referential canonical (아카이브와 중복 오판 방지).
  const canonical =
    locale === routing.defaultLocale ? "/fan-to-pro/2" : `/${locale}/fan-to-pro/2`;

  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical,
      languages: {
        en: "/fan-to-pro/2",
        ko: "/ko/fan-to-pro/2",
        "x-default": "/fan-to-pro/2",
      },
    },
    openGraph: {
      type: "website",
      url: `${SITE_URL}${canonical}`,
      title: t("ogTitle"),
      description: t("ogDescription"),
      siteName: t("siteName"),
      locale: ogLocale,
      alternateLocale: locale === "ko" ? ["en_US"] : ["ko_KR"],
    },
    twitter: {
      card: "summary_large_image",
      title: t("ogTitle"),
      description: t("ogDescription"),
    },
  };
}

const WRAP = "mx-auto w-full max-w-[1120px] px-5 md:px-8";
const LEAD_PIXEL = { lineHeight: 1.45, letterSpacing: 0 } as const;

// 수강생 미디어 = Supabase Storage(public 버킷). URL 만 참조.
const MEDIA =
  "https://rykqzenbjcggzrruryeq.supabase.co/storage/v1/object/public/cohort-media";
const SCENE_IMGS = [
  `${MEDIA}/cohort-1/IMG_6076.jpg`,
  `${MEDIA}/cohort-1/IMG_6104.jpg`,
  `${MEDIA}/cohort-1/IMG_6122.jpg`,
  `${MEDIA}/cohort-1/IMG_6144.jpg`,
  `${MEDIA}/cohort-1/IMG_6164.jpg`,
  `${MEDIA}/cohort-1/IMG_6214.jpg`,
  `${MEDIA}/cohort-1/IMG_6096.jpg`,
  `${MEDIA}/cohort-1/IMG_6205.jpg`,
];

// 여정 맵 노드 위치 (라벨은 locale). 커서 이름/색은 구조값.
// 좌표계 = 우측 "맵 존" 컬럼의 로컬 0-100% (배너 전체 X). 텍스트 존과 물리 분리라
// locale 텍스트 길이가 달라도 절대 안 겹침. A=팬 B=강의 C=경험 D=전문가 E=취업.
const NODE_POS = [
  { idx: "01", key: "fan", left: "18%", top: "30%" },
  { idx: "02", key: "lecture", left: "50%", top: "16%" },
  { idx: "03", key: "experience", left: "80%", top: "44%" },
  { idx: "04", key: "expert", left: "54%", top: "70%" },
  { idx: "05", key: "career", left: "24%", top: "82%" },
] as const;
const CURSORS = [
  { name: "LINH_V", color: "#ec4899", anim: "path1", top: "30%", left: "18%" },
  { name: "PIERRE_F", color: "#8b5cf6", anim: "path2", top: "16%", left: "50%" },
  { name: "MEI_C", color: "#6366f1", anim: "path3", top: "44%", left: "80%" },
  { name: "NINO", color: "#a855f7", anim: "path4", top: "70%", left: "54%" },
  { name: "SOFIA_M", color: "#d946ef", anim: "path5", top: "82%", left: "24%" },
] as const;

// 섹션 터미널 커맨드 헤더 (재사용).
function CmdHead({ cmd, label }: { cmd: string; label: string }) {
  return (
    <p className={`${styles.mono} mb-5 text-xs`} style={{ letterSpacing: "0.04em" }}>
      <span className="text-brand-pink">$</span>{" "}
      <span className="text-fg-muted">{cmd}</span>{" "}
      <span className="text-fg-subtle">// {label}</span>
    </p>
  );
}

export default async function FanToProPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const c = getContent(locale);
  // GC 공통 GNB 링크는 locale-aware (ko = "/ko", en = "").
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;

  return (
    <main className={`${pixelMono.variable} ${styles.canvas} min-h-screen bg-bg text-fg`}>
      {/* ===== 공용 GC GNB (단일바) =====
          서브 GNB 제거 → 다른 GC 페이지와 구조 동일한 단일 헤더. 페이지 내 앵커 이동은
          하단 플로팅 "수강 신청하기" 바(StickyCtaBar)로 대체. below 슬롯엔 진행바만.
          이 페이지 포커싱 앵커는 제거했으므로 scroll-mt 여유는 단일바 높이에 맞아 그대로 OK. */}
      <SiteHeader
        containerClassName={WRAP}
        brand={<GcWordmark variant="light-clean" href={`${prefix}/gc-preview`} />}
        menu={[
          ...gcNavBefore(prefix),
          { label: "Community", node: <CommunityGate /> },
          ...gcNavAfter(prefix),
        ]}
        actions={<GcHeaderCta prefix={prefix} />}
      />

      {/* ===== HERO (열린 배너 + 여정 맵 + 커서) ===== */}
      <section id="hero" className={`${WRAP} scroll-mt-[136px] pt-0 pb-16 lg:pt-0`}>
        <div className={`${styles.scanlines} relative overflow-hidden`}>
          {/* 배경 사진 + vignette dissolve — 배너 전체 뒤 (단색 검정 딤) */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <Image
              src="/images/stock/concert-stage-from-behind-performer-1.jpg"
              alt=""
              fill
              priority
              sizes="1120px"
              className="object-cover"
            />
            {/* 좌측 텍스트 가독 */}
            <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/55 to-transparent" />
            {/* 우측 가장자리 → 검정 dissolve (경계 제거) */}
            <div className="absolute inset-0 bg-gradient-to-l from-bg via-bg/25 to-transparent" />
            {/* 상단 가장자리 → 검정 dissolve (top-right) */}
            <div className="absolute inset-0 bg-gradient-to-b from-bg via-bg/15 to-transparent" />
            {/* 전체 vignette — 가장자리를 배경색으로 (단색 검정 딤) */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(120% 130% at 40% 55%, transparent 32%, var(--color-bg) 90%)",
              }}
            />
            {/* 하단 fade */}
            <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-transparent" />
          </div>

          {/* ===== 2-존 시스템: 텍스트(좌) | 여정 맵(우) =====
              두 존을 flex 컬럼으로 물리 분리 → locale 텍스트 길이가 달라도
              (ko 짧음 / en 김) 노드·커서와 절대 안 겹침. 맵은 desktop 전용. */}
          <div className="relative flex flex-col lg:flex-row lg:items-stretch">
            {/* 텍스트 존 */}
            <div className="px-8 py-20 sm:px-12 sm:py-24 lg:w-[56%] lg:py-28">
              <p className={`${styles.mono} ${styles.reveal} mb-7 font-bold text-brand-pink text-xs`} style={{ letterSpacing: "0.1em" }}>
                {c.hero.status}
                <span className={styles.blink}>█</span>
              </p>
              <h1
                className={`${styles.pixelFont} ${styles.reveal}`}
                style={{ fontSize: "clamp(2rem, 3.6vw, 3.4rem)", lineHeight: 1.4, animationDelay: "0.06s" }}
              >
                <span className="block">
                  {c.hero.line1a}
                  <span className="text-brand-pink">{c.hero.line1b}</span>
                  {c.hero.line1c}
                </span>
                <span className="block">{c.hero.line2}</span>
              </h1>
              <p className={`${styles.reveal} mt-7 max-w-xl text-fg-muted text-lg leading-relaxed`} style={{ animationDelay: "0.14s" }}>
                {c.hero.desc}
              </p>
              <div className={`${styles.reveal} mt-10 flex flex-col gap-4 sm:flex-row sm:items-center`} style={{ animationDelay: "0.22s" }}>
                <Button variant="pixel" href="#apply" className="px-8 py-4 text-base">{c.hero.ctaApply}</Button>
                <Button variant="pixel-ghost" href="#instructors" className="px-8 py-4 text-base">{c.hero.ctaInstructors}</Button>
              </div>
            </div>

            {/* 여정 맵 존 (desktop 전용) — 좌표계는 이 컬럼 로컬 0-100% */}
            <div className="relative hidden lg:block lg:w-[44%]">
              <div aria-hidden className="pointer-events-none absolute inset-0">
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <polyline
                    points="18,30 50,16 80,44 54,70 24,82"
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="2"
                    strokeDasharray="5 6"
                    strokeLinejoin="miter"
                    opacity="0.3"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
                {NODE_POS.map((n) => (
                  <div key={n.key} className={styles.mapNode} style={{ left: n.left, top: n.top }}>
                    <span className={styles.mapNodeDot} />
                    <span className={styles.mapNodeIdx}>{n.idx}</span>
                    {c.nodes[n.key as keyof typeof c.nodes]}
                  </div>
                ))}
              </div>
              <div className={styles.cursorLayer} aria-hidden>
                {CURSORS.map((cur) => (
                  <div
                    key={cur.name}
                    className={`${styles.cursor} ${styles[cur.anim]}`}
                    style={{ top: cur.top, left: cur.left }}
                  >
                    <svg width="26" height="26" viewBox="0 0 24 24" fill={cur.color} stroke="#fff" strokeWidth="1.5" strokeLinejoin="miter" shapeRendering="crispEdges">
                      <path d="M5 3 L5 19 L9 15 L12 21 L14 20 L11 14 L17 14 Z" />
                    </svg>
                    <span className={styles.cursorLabel} style={{ backgroundColor: cur.color }}>
                      {cur.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 강사진 (whois 창) ===== */}
      <section id="instructors" className={`${WRAP} scroll-mt-[136px] py-20`}>
        <CmdHead cmd={`whois instructors`} label={c.instructors.label} />
        <h2 className={`${styles.pixelFont} max-w-3xl text-3xl sm:text-4xl`} style={LEAD_PIXEL}>
          {c.instructors.h1}
          <br />
          <span className="text-brand-pink">{c.instructors.h2}</span>
        </h2>

        <div className="mt-12 space-y-6">
          {c.instructors.people.map((p) => (
            <article key={p.whois} className={`${styles.pixelBorder} bg-surface`}>
              <div className={styles.windowBar}>
                <span className={styles.winDot} style={{ background: "#ec4899" }} />
                <span className={styles.winDot} style={{ background: "#a855f7" }} />
                <span className={styles.winDot} style={{ background: "#6366f1" }} />
                <span className="ml-2 text-fg-muted">$ whois {p.whois}</span>
                <span className="ml-auto text-brand-pink">[ CONFIRMED ]</span>
              </div>
              <div className="flex flex-col gap-8 border-border border-b p-8 sm:flex-row sm:items-center sm:p-10">
                <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-sm border border-border">
                  <Image src={p.photo} alt={p.displayName} fill sizes="112px" className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-sm bg-brand-pink/15 px-3 py-1 font-bold text-brand-pink text-xs">
                      {p.badge}
                    </span>
                    {p.aff.map((a) => (
                      <span key={a} className="inline-flex items-center rounded-sm border border-border px-3 py-1 font-medium text-fg-muted text-xs">
                        {a}
                      </span>
                    ))}
                  </div>
                  <p className={`${styles.pixelFont} text-4xl sm:text-5xl`}>
                    {p.displayName}
                    <span className={`${styles.mono} ml-3 align-middle font-bold text-fg-muted text-base`}>{p.subName}</span>
                  </p>
                  <p className="mt-2 font-bold text-brand-pink">{p.role}</p>
                </div>
              </div>
              <div className="grid gap-8 p-8 sm:grid-cols-2 sm:p-10">
                {p.credits.map((group) => (
                  <div key={group.label}>
                    <p className={`${styles.mono} mb-4 font-bold text-brand-pink text-sm uppercase`} style={{ letterSpacing: "0.08em" }}>
                      {group.label}
                    </p>
                    <ul className="space-y-2.5">
                      {group.items.map((item) => (
                        <li key={item} className="flex items-start gap-2.5 text-fg text-sm leading-relaxed">
                          <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-sm bg-brand-pink" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
        <p className="mt-6 text-fg-subtle text-xs">{c.instructors.note}</p>
      </section>

      {/* ===== 프로그램 (full-bleed 밴드) ===== */}
      <section id="program" className="relative scroll-mt-[136px] overflow-hidden border-border border-y bg-surface">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <Image src="/images/stock/male-singer-silhouette-stage-2.jpg" alt="" fill sizes="100vw" className="object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/85 to-bg/40" />
        </div>
        <div className={`${WRAP} relative py-24`}>
          <CmdHead cmd="cat program.md" label={c.program.label} />
          <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
            <h2 className={`${styles.pixelFont} text-3xl sm:text-4xl`} style={LEAD_PIXEL}>
              {c.program.h1}
              <br />
              {c.program.h2}
            </h2>
            <div className="flex flex-col gap-6 text-fg-muted text-base leading-relaxed sm:text-lg">
              <p>{c.program.p1}</p>
              <p>{c.program.p2}</p>
              <p className="text-fg">{c.program.p3}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 커리큘럼 (파일트리) ===== */}
      <section className={`${WRAP} scroll-mt-20 py-24`}>
        <CmdHead cmd="ls curriculum/" label={c.curriculum.label} />
        <h2 className={`${styles.pixelFont} text-3xl sm:text-4xl`} style={LEAD_PIXEL}>{c.curriculum.h1}</h2>
        <p className="mt-5 max-w-2xl text-fg-muted text-base leading-relaxed sm:text-lg">{c.curriculum.desc}</p>
        <div className="mt-12 space-y-3">
          {c.curriculum.courses.map((course, idx) => (
            <details key={course.slug} open={idx === 0} className={`${styles.tree} ${styles.pixelBorder} ${styles.pixelShadowLift} bg-surface`}>
              <summary className="flex flex-wrap items-center gap-3 p-5">
                <span className={`${styles.mono} ${styles.treeCaret} text-brand-pink`}>▸</span>
                <span className={`${styles.mono} text-brand-pink text-sm`}>{course.slug}/</span>
                <span className={`${styles.pixelFont} text-lg`}>{course.title}</span>
                <span className={`${styles.mono} ml-auto text-fg-subtle text-xs`}>{course.day} / {course.mentor}</span>
              </summary>
              <ul className="space-y-3 border-border border-t px-5 py-5 text-fg text-sm leading-relaxed">
                {course.weeks.map((w, i) => (
                  <li key={w.theme} className="flex gap-2.5">
                    <span className={`${styles.mono} text-fg-subtle`}>{i === course.weeks.length - 1 ? "└─" : "├─"}</span>
                    <span className={`${styles.mono} shrink-0 text-brand-pink text-xs`}>{c.curriculum.weekLabel} {String(i + 1).padStart(2, "0")}</span>
                    <span className="min-w-0">
                      <span className="font-bold text-fg">{w.theme}</span>
                      <span className="mt-0.5 block text-fg-muted text-xs leading-relaxed">{w.desc}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      </section>

      {/* ===== 과정 (패키지 매니저) ===== */}
      <section id="courses" className={`${WRAP} scroll-mt-[136px] py-24`}>
        <CmdHead cmd="ls courses/" label={c.courses.label} />
        <h2 className={`${styles.pixelFont} mb-12 max-w-3xl text-3xl sm:text-4xl`} style={LEAD_PIXEL}>{c.courses.h1}</h2>
        <div className="grid gap-5 md:grid-cols-3">
          {c.courses.options.map((opt) => (
            <article
              key={opt.title}
              className={`${styles.pixelShadowLift} flex flex-col border bg-surface p-9 ${opt.included ? "border-brand-pink" : "border-border"}`}
            >
              <p className={`${styles.mono} mb-4 text-xs text-fg-subtle`}>
                <span className="text-brand-pink">$</span> install <span className="text-fg-muted">{opt.install}</span>
              </p>
              <div className="mb-5 flex items-center gap-3">
                <span className={`inline-flex items-center rounded-sm px-3 py-1 font-bold text-xs ${opt.included ? "bg-brand-pink/15 text-brand-pink" : "border border-border text-fg-muted"}`}>
                  {opt.tag}
                </span>
                <span className="font-semibold text-fg-subtle text-xs">{opt.lead}</span>
              </div>
              <h3 className={`${styles.pixelFont} text-2xl`}>{opt.title}</h3>
              <p className="mt-4 flex-1 text-fg-muted text-sm leading-relaxed">{opt.desc}</p>
              <div className="mt-8 flex items-end justify-between border-border border-t pt-6">
                <div>
                  <p className="text-fg-subtle text-xs">{c.courses.fee}</p>
                  <p className="mt-1 flex items-baseline gap-2">
                    <span className={`${styles.mono} text-fg-subtle text-xs line-through`}>₩{opt.listPrice.toLocaleString("en-US")}</span>
                    <span className={`${styles.pixelFont} text-fg text-lg`}>₩{opt.price.toLocaleString("en-US")}</span>
                  </p>
                </div>
                <a href="#apply" className="font-bold text-brand-pink text-sm transition-colors hover:text-brand-fuchsia">{c.courses.inquiry}</a>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ===== 지원 자격 (체크리스트) ===== */}
      <section className="relative overflow-hidden border-border border-y bg-surface">
        <div className={`${WRAP} relative py-24`}>
          <CmdHead cmd="check --eligibility" label={c.eligibility.label} />
          <h2 className={`${styles.pixelFont} text-3xl sm:text-4xl`} style={LEAD_PIXEL}>{c.eligibility.h1}</h2>
          <p className="mt-5 max-w-2xl text-fg-muted text-base leading-relaxed sm:text-lg">{c.eligibility.desc}</p>
          <div className="mt-12">
            <EligibilityChecklist
              items={c.eligibility.items}
              checkingLabel={c.eligibility.checking}
              passedLabel={c.eligibility.passed}
            />
          </div>
        </div>
      </section>

      {/* ===== 일정 (schedule.json) ===== */}
      <section className={`${WRAP} scroll-mt-20 py-24`}>
        <CmdHead cmd="cat schedule.json" label={c.schedule.label} />
        <h2 className={`${styles.pixelFont} text-3xl sm:text-4xl`} style={LEAD_PIXEL}>{c.schedule.h1}</h2>
        <div className={`${styles.pixelBorder} mt-10 bg-surface`}>
          <div className={styles.windowBar}>
            <span className={styles.winDot} style={{ background: "#6366f1" }} />
            <span className="ml-1 text-fg-muted">schedule.json</span>
            <span className="ml-auto text-fg-subtle">{c.schedule.readonly}</span>
          </div>
          <dl className="space-y-5 p-8 text-sm sm:p-10">
            <div className="flex flex-col gap-1 border-border border-b pb-5 sm:flex-row sm:items-baseline sm:justify-between">
              <dt className={`${styles.mono} text-fg-subtle`}>"start"</dt>
              <dd className="text-right">
                <span className="font-bold text-brand-pink text-lg">{c.schedule.start}</span>
                <span className="mt-1 block text-fg-subtle text-xs">{c.schedule.startNote}</span>
              </dd>
            </div>
            <div className="flex flex-col gap-1 border-border border-b pb-5 sm:flex-row sm:items-baseline sm:justify-between">
              <dt className={`${styles.mono} text-fg-subtle`}>"place"</dt>
              <dd className="text-right">
                <span className="font-bold text-fg text-lg">{c.schedule.place}</span>
                <span className="mt-1 block text-fg-subtle text-xs">{c.schedule.placeNote}</span>
              </dd>
            </div>
            <div className="flex flex-col gap-1 border-border border-b pb-5 sm:flex-row sm:items-baseline sm:justify-between">
              <dt className={`${styles.mono} text-fg-subtle`}>"enrollment"</dt>
              <dd className="text-right sm:max-w-[62%]">
                <span className="font-bold text-brand-pink text-lg">{c.schedule.enroll.value}</span>
                <span className="mt-1 block text-fg-subtle text-xs leading-relaxed">{c.schedule.enroll.note}</span>
              </dd>
            </div>
            <div>
              <dt className={`${styles.mono} text-fg-subtle`}>"refund"</dt>
              <dd className="mt-2.5">
                <span className="font-bold text-fg">{c.schedule.refund.title}</span>
                <ul className="mt-2 space-y-1.5 text-fg-muted text-xs leading-relaxed">
                  {c.schedule.refund.lines.map((line) => (
                    <li key={line} className="flex gap-2">
                      <span aria-hidden className="text-brand-pink">-</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* ===== 얻는 것 (return) ===== */}
      <section className="relative overflow-hidden border-border border-y bg-surface">
        <div className={`${WRAP} relative py-24`}>
          <CmdHead cmd="return outcomes[]" label={c.outcomes.label} />
          <h2 className={`${styles.pixelFont} text-3xl sm:text-4xl`} style={LEAD_PIXEL}>{c.outcomes.h1}</h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {c.outcomes.items.map((o, i) => (
              <article key={o.t} className={`${styles.pixelBorder} ${styles.pixelShadowLift} bg-bg p-7`}>
                <div className="flex items-baseline gap-3">
                  <span className={`${styles.mono} text-brand-pink text-sm`}>{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="font-bold text-fg text-lg">{o.t}</h3>
                </div>
                <p className="mt-3 text-fg-muted text-sm leading-relaxed">{o.d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 1기 이야기 ===== */}
      <section className="relative overflow-hidden border-border border-y">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <Image src="/images/stock/korean-concert-audience-2.jpg" alt="" fill sizes="100vw" className="object-cover opacity-[0.18]" />
          <div className="absolute inset-0 bg-gradient-to-b from-bg via-bg/90 to-bg" />
        </div>
        <div className={`${WRAP} relative py-24`}>
          <CmdHead cmd="git log cohort_01" label={c.cohort1.label} />
          <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-end lg:gap-20">
            <div>
              <h2 className={`${styles.pixelFont} text-3xl sm:text-4xl`} style={LEAD_PIXEL}>
                <span className="text-brand-pink">{c.cohort1.h1a}</span>{c.cohort1.h1b}
                <br />
                {c.cohort1.h2}
              </h2>
              <p className="mt-6 max-w-lg text-fg-muted text-base leading-relaxed sm:text-lg">{c.cohort1.desc}</p>
              <Button variant="pixel-ghost" href={`${prefix}/fan-to-pro/1`} className="mt-9 px-6 py-3 text-sm">
                {c.cohort1.archive}
              </Button>
            </div>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-10">
              {c.cohort1.stats.map((s) => (
                <div key={s.l}>
                  <dd className={`${styles.pixelFont} text-fg text-4xl sm:text-5xl`}>
                    <StatCountUp value={s.n} />
                  </dd>
                  <dt className="mt-2 text-fg-muted text-sm">{s.l}</dt>
                </div>
              ))}
            </dl>
          </div>

          {/* 후기 (commit log) */}
          <div className="mt-16">
            <p className={`${styles.mono} mb-6 text-fg-subtle text-xs`}>// {c.cohort1.reviewsLabel} (n={c.cohort1.reviews.length})</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {c.cohort1.reviews.map((t, idx) => {
                const hash = ((t.initial.charCodeAt(0) * 131 + idx * 977 + 53).toString(16) + "0000000").slice(0, 7);
                return (
                  <figure key={t.initial + idx} className={`${styles.pixelBorder} ${styles.pixelShadowLift} flex flex-col bg-surface p-6`}>
                    <div className={`${styles.mono} mb-4 flex items-center gap-2 text-xs`}>
                      <span className="text-brand-pink">●</span>
                      <span className="text-fg-subtle">commit</span>
                      <span className="text-brand-pink">{hash}</span>
                    </div>
                    <blockquote className="flex-1 text-fg text-sm leading-relaxed">{t.quote}</blockquote>
                    <figcaption className="mt-5 space-y-1 border-border border-t pt-4 text-xs">
                      <p><span className={`${styles.mono} text-fg-subtle`}>{c.cohort1.author}</span>{" "}<span className="text-fg-muted">{t.initial}, {t.who}</span></p>
                      <p><span className={`${styles.mono} text-fg-subtle`}>{c.cohort1.goal}</span>{" "}<span className="text-fg-muted">{t.goal}</span></p>
                    </figcaption>
                  </figure>
                );
              })}
            </div>
            <p className="mt-5 text-fg-subtle text-xs leading-relaxed">{c.cohort1.reviewNote}</p>
          </div>

          {/* 현장 (Storage 영상 + 실사진, 스켈레톤) */}
          <div className="mt-16">
            <p className={`${styles.mono} mb-6 text-fg-subtle text-xs`}>
              <span className="text-brand-pink">$</span> {c.cohort1.scenesCmd} <span className="text-fg-subtle">// {c.cohort1.scenesLabel}</span>
            </p>
            <PixelVideo
              src={`${MEDIA}/cohort-1/foodie-1.mp4`}
              poster={`${MEDIA}/cohort-1/IMG_6205.jpg`}
              label="● REC / cohort_01"
              className={`${styles.pixelBorder} aspect-video bg-surface`}
            />
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {SCENE_IMGS.map((src) => (
                <PixelImage key={src} src={src} alt="cohort 1" sizes="(max-width:640px) 50vw, 25vw" className={`${styles.pixelBorder} ${styles.pixelShadowLift} aspect-[4/3]`} />
              ))}
            </div>
            <p className="mt-4 text-fg-subtle text-xs">{c.cohort1.scenesNote}</p>
          </div>
        </div>
      </section>

      {/* ===== 보도 (Press) ===== */}
      <section id="press" className={`${WRAP} scroll-mt-[136px] py-24`}>
        <CmdHead cmd="cat press/" label={c.press.label} />
        <h2 className={`${styles.pixelFont} text-3xl sm:text-4xl`} style={LEAD_PIXEL}>{c.press.h1}</h2>
        <div className="mt-10 flex flex-col gap-3">
          {PRESS_ARTICLES.map((a) => (
            <a
              key={a.url}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.pixelBorder} ${styles.pixelShadowLift} group flex items-center gap-4 bg-surface p-4 sm:gap-5 sm:p-5`}
            >
              <PixelImage src={a.thumb} alt="" sizes="112px" className="aspect-square w-20 shrink-0 border border-border sm:w-28" />
              <div className="min-w-0 flex-1">
                <p className={`${styles.mono} text-fg-subtle text-xs`}>{a.outlet} / {a.date}</p>
                <h3 className="mt-1 font-bold text-fg leading-snug sm:text-lg">{pressTitle(a, locale)}</h3>
                <p className="mt-1.5 line-clamp-2 text-fg-muted text-sm leading-relaxed">{pressDesc(a, locale)}</p>
              </div>
              <span aria-hidden className={`${styles.mono} shrink-0 self-center text-brand-pink text-lg transition-transform group-hover:translate-x-0.5`}>→</span>
            </a>
          ))}
        </div>
      </section>

      {/* ===== 신청 (과정 선택) ===== */}
      <section id="apply" className={`${WRAP} scroll-mt-[136px] py-24`}>
        <p className={`${styles.mono} mb-5 text-xs`} style={{ letterSpacing: "0.04em" }}>
          <span className="text-brand-pink">$</span> {c.apply.cmd}
          <span className={styles.blink} aria-hidden>_</span>
          <span className="ml-2 text-fg-subtle">// {c.apply.label}</span>
        </p>
        <h2 className={`${styles.pixelFont} text-3xl sm:text-4xl`} style={LEAD_PIXEL}>{c.apply.h1}</h2>
        <p className="mt-5 max-w-xl text-fg-muted text-base leading-relaxed sm:text-lg">{c.apply.desc}</p>
        <div className="mt-10">
          <ApplyFlow courses={c.apply.courses} t={c.apply} formT={c.applyForm} />
        </div>
      </section>

      {/* ===== Footer (공통 라이트 SiteFooter. 푸터 nav = GC 사이트 구조 절대경로) ===== */}
      <SiteFooter nav={gcFooterNav(prefix)} />

      {/* 하단 고정 신청 바 (공용 StickyCtaBar, 데스크탑+모바일 노출 = 서브 GNB 대체).
          어두운 픽셀 톤 불투명 바(border-t + bg-bg). 좌측 문구(데스크탑) + 우측 버튼.
          모바일은 풀폭 버튼. #apply 진입 시 숨김. */}
      <StickyCtaBar hideAtId="apply" showOnDesktop maxWidthClassName="max-w-[1120px]">
        <div className="flex items-center gap-4 rounded-full bg-white px-5 py-2.5 shadow-[0_8px_28px_rgba(0,0,0,0.45)] md:pl-6">
          <div className="hidden min-w-0 flex-1 items-center gap-3 md:flex">
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-pink px-3 py-1.5 font-black text-[11px] text-white uppercase tracking-[0.1em]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                <path d="M13 5v2" />
                <path d="M13 11v2" />
                <path d="M13 17v2" />
              </svg>
              Open
            </span>
            <p className="truncate font-bold text-[#191F28] text-sm">
              {c.nav.stickyLead}
            </p>
          </div>
          <Button
            variant="pink-solid"
            href="#apply"
            className="w-full rounded-full py-3.5 md:w-auto md:px-8"
          >
            {c.nav.apply}
          </Button>
        </div>
      </StickyCtaBar>
    </main>
  );
}
