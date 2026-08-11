import type { Metadata } from "next";
import Image from "next/image";
import { CommunityGate } from "@/app/[locale]/gc-preview/community-gate";
import gc from "@/app/[locale]/gc-preview/gc.module.css";
import { gcFooterNav, gcNavAfter, gcNavBefore } from "@/src/programs/growth-career/presentation/gc-nav";
import { SiteFooter } from "@/src/shared/navigation/site-footer";
import { SiteHeader } from "@/src/shared/navigation/site-header";
import { GcWordmark } from "@/src/shared/navigation/gc-wordmark";
import { GcHeaderCta } from "@/src/shared/navigation/gc-header-cta";
import { Button } from "@/src/shared/ui/button";
import { Card } from "@/src/shared/ui/card";
import { SectionHeader } from "@/src/shared/ui/section-header";
import { StatusBadge, type ProgramStatus } from "@/src/shared/ui/status-badge";

/* =============================================================================
   Fan to Pro 브랜드 소개 + 기수(cohort) 리스트. 프리뷰 (배포 X, noindex).
   히어로 → 철학 → 차별점 2 → 1기 흔적(실사진+후기) → 기수 리스트.
   "Fan to Pro란 무엇 + 왜 다른가" 전달. 2기 모집 상세(강사/커리큘럼/지원)는
   /fan-to-pro/2 에 있으니 여기선 반복 X.
   이중언어: locale 로 COPY 분기 (ko = /ko/fan-to-pro, en = /fan-to-pro).
   카피는 humanizer A등급 확인. 1기 인원수(N명) 표기 X, 8개국만.
   컬러 그라데이션 X, 글로우 X (§6.8). 딤은 단색(검정) alpha 만.
   globals.css 안 건드림 (1기 동결).
   ============================================================================= */

export const metadata: Metadata = {
  title: "Fan to Pro",
};

const WRAP = "mx-auto w-full max-w-[1160px] px-5 md:px-8";
const HEAD = { letterSpacing: "-0.02em", lineHeight: 1.24 } as const;

const CM =
  "https://rykqzenbjcggzrruryeq.supabase.co/storage/v1/object/public/cohort-media/cohort-1";
/** 1기 실사진 (Supabase Storage). next.config 원격 호스트 미설정이라 plain img. */
const IMG = (name: string) => `${CM}/${name}`;

type Split = { pre: string; hi: string };
type Differentiator = { label: string; title: string; body: string; img: string; alt: string };
type Review = { name: string; origin: string; quote: string };
type CohortCard = {
  edition: string;
  status: ProgramStatus;
  statusLabel: string;
  title: string;
  period: string;
  thumbnailSrc: string;
  thumbnailAlt: string;
  curriculumLines: string[];
  ctaLabel: string;
  ctaHref: string;
  ctaVariant: "pink-solid" | "ghost";
};

type PageCopy = {
  heroEyebrow: string;
  heroH1: { l1: string; l2: string };
  heroSub: string;
  heroCta: string;
  heroAlt: string;
  philLabel: string;
  philTitle: Split;
  philBody: string;
  diffLabel: string;
  diffTitle: Split;
  differentiators: Differentiator[];
  proofLabel: string;
  proofTitle: Split;
  proofBody: string;
  gallery: { src: string; alt: string }[];
  reviews: Review[];
  listLabel: string;
  listTitle: Split;
  listBody: string;
  cohorts: CohortCard[];
};

const COPY: Record<"ko" | "en", PageCopy> = {
  ko: {
    heroEyebrow: "Fan to Pro",
    heroH1: { l1: "좋아하던 K컬처,", l2: "이제 현장에서 만듭니다" },
    heroSub:
      "Fan to Pro는 K컬처 산업의 직무 교육 프로그램입니다. 무대 뒤에서 일이 실제로 어떻게 돌아가는지, 현장에서 뛰는 사람들에게 직접 배웁니다.",
    heroCta: "2기 모집 보기",
    heroAlt: "K팝 콘서트 무대",
    philLabel: "Fan to Pro",
    philTitle: { pre: "좋아하는 마음에서 ", hi: "시작합니다" },
    philBody:
      "누구나 팬으로 시작합니다. 그 마음이 얼마나 큰 힘인지 압니다. Fan to Pro는 좋아하는 마음을 현장에서 통하는 실력으로 잇습니다. K컬처를 즐기던 사람이, K컬처를 함께 만드는 사람이 되도록.",
    diffLabel: "왜 다른가",
    diffTitle: { pre: "현장에서 배우고 ", hi: "현장으로 이어집니다" },
    differentiators: [
      {
        label: "01",
        title: "실전과 같은 교육",
        body: "강의실 이론으로 끝나지 않습니다. 현직 A&R 디렉터와 음향 감독이 실제 현장에서 쓰는 장비와 방식 그대로 배웁니다. 무대 뒤 진짜 일의 감각을 몸으로 익힙니다.",
        img: IMG("IMG_6104.jpg"),
        alt: "Fan to Pro 1기 음향 실습 현장",
      },
      {
        label: "02",
        title: "진짜 현장으로 이어집니다",
        body: "배운 것을 실제 K-pop 공연 프로젝트에서 써봅니다. 현장에 참여한 경험이 포트폴리오로 남고, 유니온 픽처스 참여 확인서로 증명됩니다.",
        img: "/images/stock/concert-stage-from-behind-performer-2.jpg",
        alt: "K팝 공연 무대",
      },
    ],
    proofLabel: "1기 흔적",
    proofTitle: { pre: "8개국이 함께 겪은 ", hi: "진짜 현장" },
    proofBody:
      "1기는 8개국에서 온 수강생과 8회 16시간을 함께했고, 모두가 실제 공연 현장을 경험했습니다.",
    gallery: [
      { src: IMG("IMG_6076.jpg"), alt: "Fan to Pro 1기 현장 1" },
      { src: IMG("IMG_6122.jpg"), alt: "Fan to Pro 1기 현장 2" },
      { src: IMG("IMG_6164.jpg"), alt: "Fan to Pro 1기 현장 3" },
      { src: IMG("IMG_6205.jpg"), alt: "Fan to Pro 1기 현장 4" },
    ],
    reviews: [
      {
        name: "다비",
        origin: "베트남",
        quote:
          "음향 수업이 제일 좋았어요. 공연 하나가 무대에 오르기까지 뒤에서 이렇게 많은 걸 준비하는지 그때 처음 알았거든요.",
      },
      {
        name: "Martina",
        origin: "이탈리아",
        quote:
          "혼자였으면 절대 못 만났을 업계 사람들한테 직접 배우고 궁금한 걸 바로바로 물어본 게 제일 컸어요.",
      },
      {
        name: "Celine",
        origin: "필리핀",
        quote: "무대 뒤에서 음악이 실제로 어떻게 굴러가는지 눈으로 봤어요.",
      },
    ],
    listLabel: "기수",
    listTitle: { pre: "모집 중인 기수와 ", hi: "지나온 기수" },
    listBody: "지금 모집 중인 기수와 이미 마친 기수를 함께 봅니다.",
    cohorts: [
      {
        edition: "2기",
        status: "open",
        statusLabel: "모집중",
        title: "Fan to Pro 엔터 2기",
        period: "4주 커리큘럼 / 주말 / K엔터 실무",
        thumbnailSrc: "/images/stock/boy-group-concert-stage-2.jpg",
        thumbnailAlt: "K팝 보이그룹 콘서트 무대",
        curriculumLines: [
          "A&R 단과반 (일) / 음향 감독 단과반 (토)",
          "뮤직 비즈니스와 음반 기획, A&R 실무",
          "라이브 사운드, IEM 모니터, 미니 공연 실습",
          "올인원은 두 단과 모두 수강",
        ],
        ctaLabel: "2기 모집 보기",
        ctaHref: "/fan-to-pro/2",
        ctaVariant: "pink-solid",
      },
      {
        edition: "1기",
        status: "completed",
        statusLabel: "종료",
        title: "Fan to Pro 엔터 1기",
        period: "4주 8회 / 2026.06 부터 07 / 8개국 수료",
        thumbnailSrc: IMG("IMG_6096.jpg"),
        thumbnailAlt: "Fan to Pro 1기 현장",
        curriculumLines: [
          "4주 8회 16시간 K팝 실무 집중",
          "공연 구조와 백스테이지 이해",
          "실제 공연 프로젝트 참여로 포트폴리오",
          "8개국 수강생 전원 수료",
        ],
        ctaLabel: "1기 다시 보기",
        ctaHref: "/fan-to-pro/1",
        ctaVariant: "ghost",
      },
    ],
  },
  en: {
    heroEyebrow: "Fan to Pro",
    heroH1: { l1: "You loved K-culture,", l2: "now you help make it" },
    heroSub:
      "Fan to Pro is a job training program for the K-culture industry. You learn how the work really happens backstage, straight from the people who do it.",
    heroCta: "See Cohort 2",
    heroAlt: "K-pop concert stage",
    philLabel: "Fan to Pro",
    philTitle: { pre: "It starts with ", hi: "what you love" },
    philBody:
      "Everyone starts as a fan. We know how far that love can carry you. Fan to Pro turns it into skills that hold up on a real set, so the people who enjoyed K-culture become the ones who help make it.",
    diffLabel: "Why it is different",
    diffTitle: { pre: "Learn on real sets, ", hi: "then work on them" },
    differentiators: [
      {
        label: "01",
        title: "Training that feels like the real thing",
        body: "It does not stop at classroom theory. You learn on the same gear and in the same way that working A&R directors and sound engineers use on real sets. You build a hands-on feel for how the job actually works backstage.",
        img: IMG("IMG_6104.jpg"),
        alt: "Fan to Pro Cohort 1 sound practice",
      },
      {
        label: "02",
        title: "It leads to a real stage",
        body: "You put what you learn to work on an actual K-pop production. That experience becomes part of your portfolio, backed by a certificate of participation from Union Pictures.",
        img: "/images/stock/concert-stage-from-behind-performer-2.jpg",
        alt: "K-pop performance stage",
      },
    ],
    proofLabel: "Cohort 1",
    proofTitle: { pre: "Real fieldwork, ", hi: "shared across 8 countries" },
    proofBody:
      "Cohort 1 brought together students from 8 countries over 8 sessions and 16 hours, and everyone stepped onto a real production.",
    gallery: [
      { src: IMG("IMG_6076.jpg"), alt: "Fan to Pro Cohort 1 on site 1" },
      { src: IMG("IMG_6122.jpg"), alt: "Fan to Pro Cohort 1 on site 2" },
      { src: IMG("IMG_6164.jpg"), alt: "Fan to Pro Cohort 1 on site 3" },
      { src: IMG("IMG_6205.jpg"), alt: "Fan to Pro Cohort 1 on site 4" },
    ],
    reviews: [
      {
        name: "Davi",
        origin: "Vietnam",
        quote:
          "The sound class was my favorite. That was the first time I understood how much gets prepared behind the scenes before a single show reaches the stage.",
      },
      {
        name: "Martina",
        origin: "Italy",
        quote:
          "The biggest thing was learning straight from industry people I would never have met on my own, and getting my questions answered right there.",
      },
      {
        name: "Celine",
        origin: "Philippines",
        quote: "I saw with my own eyes how the music actually runs behind the stage.",
      },
    ],
    listLabel: "Cohorts",
    listTitle: { pre: "Open now, ", hi: "and the ones before" },
    listBody: "The cohort recruiting now, alongside the ones that have wrapped.",
    cohorts: [
      {
        edition: "Cohort 2",
        status: "open",
        statusLabel: "Open",
        title: "Fan to Pro Ent Cohort 2",
        period: "4-week curriculum / weekends / K-ent hands-on",
        thumbnailSrc: "/images/stock/boy-group-concert-stage-2.jpg",
        thumbnailAlt: "K-pop boy group concert stage",
        curriculumLines: [
          "A&R course (Sun) / Sound Director course (Sat)",
          "Music business, album planning, A&R in practice",
          "Live sound, IEM monitoring, a hands-on mini show",
          "All-in-one covers both courses",
        ],
        ctaLabel: "See Cohort 2",
        ctaHref: "/fan-to-pro/2",
        ctaVariant: "pink-solid",
      },
      {
        edition: "Cohort 1",
        status: "completed",
        statusLabel: "Closed",
        title: "Fan to Pro Ent Cohort 1",
        period: "8 sessions over 4 weeks / Jun to Jul 2026 / 8 countries",
        thumbnailSrc: IMG("IMG_6096.jpg"),
        thumbnailAlt: "Fan to Pro Cohort 1 on site",
        curriculumLines: [
          "8 sessions, 16 hours of K-pop practice over 4 weeks",
          "How a show is built, and the backstage roles",
          "A portfolio from joining a real production",
          "Students from 8 countries, all completed",
        ],
        ctaLabel: "Revisit Cohort 1",
        ctaHref: "/fan-to-pro/1",
        ctaVariant: "ghost",
      },
    ],
  },
};

export default async function FanToProPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = COPY[locale === "ko" ? "ko" : "en"];
  const prefix = locale === "ko" ? "/ko" : "";

  return (
    <main className="min-h-screen break-keep bg-white text-[#191F28]">
      <SiteHeader
        brand={<GcWordmark variant="light-clean" href={`${prefix}/gc-preview`} />}
        menu={[
          ...gcNavBefore(prefix),
          { label: "Community", node: <CommunityGate /> },
          ...gcNavAfter(prefix),
        ]}
        actions={<GcHeaderCta prefix={prefix} />}
      />

      {/* ===== HERO (좌측 정렬, 2컬럼 텍스트 좌 / 이미지 우. 컴포지션 룰 A) ===== */}
      <section className={`${WRAP} pt-14 pb-20 sm:pt-20`}>
        <div className="grid gap-y-7 lg:grid-cols-[1fr_1.15fr] lg:items-center lg:gap-x-14">
          <p
            className={`${gc.reveal} font-bold text-[15px] text-brand-pink lg:col-start-1 lg:row-start-1 lg:self-end`}
          >
            {t.heroEyebrow}
          </p>
          <h1
            className={`${gc.reveal} text-balance font-black text-[#191F28] lg:col-start-1 lg:row-start-2`}
            style={{ ...HEAD, fontSize: "clamp(2.1rem, 4.6vw, 3.6rem)", animationDelay: "0.05s" }}
          >
            {t.heroH1.l1}
            <br />
            <span className="text-brand-pink">{t.heroH1.l2}</span>
          </h1>
          <div
            className={`${gc.reveal} relative aspect-[16/9] w-full overflow-hidden rounded-2xl lg:col-start-2 lg:row-start-2 lg:row-span-3 lg:aspect-auto lg:h-full lg:self-stretch`}
            style={{ animationDelay: "0.1s" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/stock/boy-group-concert-stage-3.jpg"
              alt={t.heroAlt}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
          </div>
          <p
            className={`${gc.reveal} max-w-md text-[17px] text-[#4E5968] leading-relaxed lg:col-start-1 lg:row-start-3`}
            style={{ animationDelay: "0.16s" }}
          >
            {t.heroSub}
          </p>
          <div
            className={`${gc.reveal} flex flex-col gap-3 sm:flex-row lg:col-start-1 lg:row-start-4 lg:self-start`}
            style={{ animationDelay: "0.22s" }}
          >
            <Button variant="pink-solid" href={`${prefix}/fan-to-pro/2`} className="px-6 py-3.5 text-[15px]">
              {t.heroCta} <span aria-hidden>→</span>
            </Button>
          </div>
        </div>
      </section>

      {/* ===== 철학 (배경 연회색) ===== */}
      <section className="bg-[#F7F8FA] py-20">
        <div className={WRAP}>
          <div className={gc.reveal}>
            <SectionHeader
              label={t.philLabel}
              title={
                <>
                  {t.philTitle.pre}
                  <span className="text-brand-pink">{t.philTitle.hi}</span>
                </>
              }
              description={t.philBody}
            />
          </div>
        </div>
      </section>

      {/* ===== 차별점 2가지 ===== */}
      <section className="py-20">
        <div className={WRAP}>
          <div className={gc.reveal}>
            <SectionHeader
              label={t.diffLabel}
              title={
                <>
                  {t.diffTitle.pre}
                  <span className="text-brand-pink">{t.diffTitle.hi}</span>
                </>
              }
            />
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {t.differentiators.map((d, idx) => (
              <div
                key={d.label}
                className={gc.reveal}
                style={{ animationDelay: `${0.08 + idx * 0.08}s` }}
              >
                <DifferentiatorCard item={d} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 1기 흔적 (proof) ===== */}
      <section className="bg-[#F7F8FA] py-20">
        <div className={WRAP}>
          <div className={gc.reveal}>
            <SectionHeader
              label={t.proofLabel}
              title={
                <>
                  {t.proofTitle.pre}
                  <span className="text-brand-pink">{t.proofTitle.hi}</span>
                </>
              }
              description={t.proofBody}
            />
          </div>

          <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {t.gallery.map((g, idx) => (
              <div
                key={g.src}
                className={`${gc.reveal} relative aspect-[4/3] overflow-hidden rounded-xl`}
                style={{ animationDelay: `${0.06 + idx * 0.06}s` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={g.src}
                  alt={g.alt}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 hover:scale-[1.04]"
                />
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {t.reviews.map((r, idx) => (
              <div
                key={r.name}
                className={gc.reveal}
                style={{ animationDelay: `${0.1 + idx * 0.06}s` }}
              >
                <Card variant="clean" as="figure" className="flex h-full flex-col p-6 sm:p-7">
                  <blockquote className="text-[#191F28] text-[15px] leading-relaxed">
                    {r.quote}
                  </blockquote>
                  <figcaption className="mt-5 flex items-center gap-1.5 text-sm">
                    <span className="font-bold text-[#191F28]">{r.name}</span>
                    <span className="text-[#8B95A1]">{r.origin}</span>
                  </figcaption>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 기수 리스트 ===== */}
      <section className="py-20">
        <div className={WRAP}>
          <div className={gc.reveal}>
            <SectionHeader
              label={t.listLabel}
              title={
                <>
                  {t.listTitle.pre}
                  <span className="text-brand-pink">{t.listTitle.hi}</span>
                </>
              }
              description={t.listBody}
            />
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {t.cohorts.map((c, idx) => (
              <div
                key={c.edition}
                className={gc.reveal}
                style={{ animationDelay: `${0.08 + idx * 0.08}s` }}
              >
                <CohortCardView cohort={c} prefix={prefix} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter nav={gcFooterNav(prefix)} />
    </main>
  );
}

function DifferentiatorCard({ item: d }: { item: Differentiator }) {
  return (
    <Card variant="clean" className="group flex h-full flex-col overflow-hidden">
      <div className="relative aspect-[16/9] w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={d.img}
          alt={d.alt}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <span className="absolute left-5 top-5 font-black text-[15px] text-white/90">
          {d.label}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-7 sm:p-8">
        <h3 className="font-black text-[#191F28] text-[22px] sm:text-[24px]" style={HEAD}>
          {d.title}
        </h3>
        <p className="mt-3 text-[#4E5968] text-[15px] leading-relaxed">{d.body}</p>
      </div>
    </Card>
  );
}

function CohortCardView({ cohort: c, prefix }: { cohort: CohortCard; prefix: string }) {
  const isSupabase = c.thumbnailSrc.startsWith("http");

  return (
    <Card variant="clean" className="group flex h-full flex-col overflow-hidden">
      {/* 썸네일 16:9. Supabase 원격은 next.config 미설정이라 plain img. */}
      <div className="relative aspect-[16/9] w-full overflow-hidden">
        {isSupabase ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={c.thumbnailSrc}
            alt={c.thumbnailAlt}
            className={`absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] ${c.status === "completed" ? "grayscale-[0.35]" : ""}`}
          />
        ) : (
          <Image
            src={c.thumbnailSrc}
            alt={c.thumbnailAlt}
            fill
            sizes="(min-width: 640px) 560px, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        )}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
      </div>

      <div className="flex flex-1 flex-col p-6 sm:p-7">
        <div className="flex items-center gap-2">
          <StatusBadge status={c.status} label={c.statusLabel} />
          <span className="font-bold text-[#8B95A1] text-sm">{c.edition}</span>
        </div>

        <h3 className="mt-4 font-black text-[#191F28] text-[22px] sm:text-[24px]" style={HEAD}>
          {c.title}
        </h3>
        <p className="mt-2 text-[#4E5968] text-sm leading-relaxed">{c.period}</p>

        <div className="mt-5 rounded-xl bg-[#F7F8FA] px-4 py-3.5">
          <ul className="space-y-1.5">
            {c.curriculumLines.map((line) => (
              <li
                key={line}
                className="flex gap-2 text-[#4E5968] text-[14px] leading-relaxed"
              >
                <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand-pink" />
                <span className="min-w-0">{line}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 flex flex-1 items-end">
          <Button
            variant={c.ctaVariant}
            href={`${prefix}${c.ctaHref}`}
            className={`w-full px-5 py-3.5 text-[15px] ${c.ctaVariant === "pink-solid" ? "group-hover:brightness-95" : ""}`}
          >
            {c.ctaLabel} <span aria-hidden>→</span>
          </Button>
        </div>
      </div>
    </Card>
  );
}
