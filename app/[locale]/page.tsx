import type { Metadata } from "next";
import Image from "next/image";
import { SiteFooter } from "@/src/shared/navigation/site-footer";
import { SiteHeader } from "@/src/shared/navigation/site-header";
import { GcWordmark } from "@/src/shared/navigation/gc-wordmark";
import { GcHeaderCta } from "@/src/shared/navigation/gc-header-cta";
import { Button } from "@/src/shared/ui/button";
import { Card } from "@/src/shared/ui/card";
import { SectionHeader } from "@/src/shared/ui/section-header";
import { gcFooterNav, gcNavAfter, gcNavBefore } from "@/src/programs/growth-career/presentation/gc-nav";
import { CommunityGate } from "@/app/[locale]/gc-preview/community-gate";
import styles from "@/app/[locale]/gc-preview/gc.module.css";

/* =============================================================================
   Growth Career 플랫폼 메인 (우산 브랜드) · 라이트, 원티드/잡플래닛 결. 정식 런칭 (루트 /).
   디자인 시스템: 공통 SiteHeader / Button / Card / StickyCtaBar (src/shared).
   페이지 로컬 버튼·카드 상수 없음 = 어디서든 재사용.
   AI 티 제거: 모노 폰트 없음, 헤드라인 끝 마침표 없음, 인사이트는 실사진 카드.
   글래스 X, 컬러 그라데이션 X, 글로우 X (§6.8). 딤은 단색 alpha 만.
   전역 globals.css 안 건드림 (1기 동결).
   이중언어: locale 로 COPY 분기 (ko = /ko, en = /).
   ============================================================================= */

const SITE_URL = "https://growthcareer.xyz";

const META: Record<"ko" | "en", { title: string; description: string; ogImage: string }> = {
  ko: {
    title: "Growth Career | 재한 외국인을 위한 커리어 플랫폼",
    description:
      "K엔터 실무 교육 Fan to Pro에서 시작해, 비자부터 취업까지 한국 생활에 필요한 정보를 공식 자료로 한곳에 모았습니다.",
    ogImage:
      "https://rykqzenbjcggzrruryeq.supabase.co/storage/v1/object/public/cohort-media/cohort-1/IMG_6076.jpg",
  },
  en: {
    title: "Growth Career | A career platform for internationals in Korea",
    description:
      "Start with Fan to Pro, our hands-on K-ent training, and find everything you need for life in Korea from visas to jobs, gathered from official sources in one place.",
    ogImage:
      "https://rykqzenbjcggzrruryeq.supabase.co/storage/v1/object/public/cohort-media/cohort-1/IMG_6076.jpg",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isKo = locale === "ko";
  const m = META[isKo ? "ko" : "en"];
  const canonical = isKo ? "/ko" : "";
  const ogLocale = isKo ? "ko_KR" : "en_US";

  return {
    title: { absolute: m.title },
    description: m.description,
    alternates: {
      canonical: canonical === "" ? "/" : canonical,
      languages: {
        en: "/",
        ko: "/ko",
        "x-default": "/",
      },
    },
    openGraph: {
      type: "website",
      locale: ogLocale,
      alternateLocale: isKo ? ["en_US"] : ["ko_KR"],
      url: `${SITE_URL}${canonical === "" ? "/" : canonical}`,
      siteName: "Growth Career",
      title: m.title,
      description: m.description,
      images: [m.ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: m.title,
      description: m.description,
      images: [m.ogImage],
    },
  };
}

const WRAP = "mx-auto w-full max-w-[1160px] px-5 md:px-8";
const HEAD = { letterSpacing: "-0.02em", lineHeight: 1.24 } as const;

const MEDIA =
  "https://rykqzenbjcggzrruryeq.supabase.co/storage/v1/object/public/cohort-media";

type Split = { pre: string; hi: string };
type Track = { domain: string; status: string; live: boolean; cta?: string };
// key = 이미지 파일명(public/images/insight/{key}.jpg), slug = 실제 아티클 경로.
type InsightCard = { key: string; slug: string; label: string; q: string; src: string };
type Review = { name: string; origin: string; liked: string; wish: string };
type Stat = { n: string; l: string };

type PageCopy = {
  heroEyebrow: string;
  heroH1: { l1: string; l2: string };
  heroImgAlt: string;
  heroSub: string;
  heroCtaPrimary: string;
  heroCtaSecondary: string;

  eduLabel: string;
  eduTitle: Split;
  eduDesc: string;
  eduCohortTag: string;
  eduCohortTitle: { pre: string; hi: string };
  eduCohortCta: string;
  tracks: Track[];

  insightLabel: string;
  insightTitle: Split;
  insightDesc: string;
  insight: InsightCard[];

  communityLabel: string;
  communityTitle: string;
  communityDesc: string;
  communityStats: Stat[];
  communityGate: string;
  communityLockLabel: string;

  reviewsLabel: string;
  reviewsTitle: Split;
  reviewsDesc: string;
  reviews: Review[];
  reviewWishLabel: string;
  trustStats: Stat[];
  trustCta: string;

  visionLabel: string;
  visionTitle: Split;
  visionDesc: string;

  menuCommunity: string;
};

const COPY: Record<"ko" | "en", PageCopy> = {
  ko: {
    heroEyebrow: "재한 외국인을 위한 커리어 플랫폼",
    heroH1: { l1: "한국에서 커리어를 시작하는", l2: "가장 확실한 길" },
    heroImgAlt: "Fan to Pro 1기 현장",
    heroSub:
      "엔터테인먼트 실무 교육 Fan to Pro에서 시작해, 비자부터 취업까지 한국 생활에 필요한 정보를 공식 자료로 한곳에 모았습니다",
    heroCtaPrimary: "지금 모집 중인 교육",
    heroCtaSecondary: "인사이트 둘러보기",

    eduLabel: "Fan to Pro",
    eduTitle: { pre: "좋아하는 마음을 ", hi: "실무 경력" },
    eduDesc:
      "Fan to Pro는 엔터테인먼트 산업의 실무 직무 교육입니다. 무대 뒤에서 일이 실제로 어떻게 돌아가는지, 현장에서 뛰는 사람들에게 직접 배웁니다",
    eduCohortTag: "지금 모집 중",
    eduCohortTitle: { pre: "Fan to Pro 엔터 ", hi: "2기" },
    eduCohortCta: "2기 알아보기",
    tracks: [
      { domain: "A&R 단과반", status: "2기 모집 중", live: true, cta: "아이돌과 공연 실무 보기" },
      { domain: "음향 감독 단과반", status: "2기 모집 중", live: true, cta: "무대 음향 실무 보기" },
      { domain: "올인원", status: "2기 모집 중", live: true, cta: "두 과정과 공연 프로젝트" },
    ],

    insightLabel: "인사이트",
    insightTitle: { pre: "한국 생활, 막막하지 않게 ", hi: "공식 자료" },
    insightDesc:
      "비자, TOPIK, 한국어, 금융, 취업. 외교부와 출입국, 국립국제교육원 등 공식 국가기관 자료만 담습니다. 확인되지 않은 정보는 싣지 않습니다.",
    insight: [
      { key: "visa", slug: "visa-info", label: "비자", q: "D-2 유학 비자, 어떻게 연장하나요?", src: "HiKorea 출입국" },
      { key: "topik", slug: "topik-2026", label: "TOPIK", q: "2026 TOPIK 일정과 접수 방법은?", src: "국립국제교육원" },
      { key: "korean", slug: "free-korean", label: "한국어", q: "무료로 한국어를 배우려면?", src: "세종학당" },
      { key: "finance", slug: "bank-account", label: "금융", q: "외국인이 은행 계좌를 만들려면?", src: "금융감독원" },
      { key: "work", slug: "part-time-work", label: "취업 알바", q: "유학생도 아르바이트할 수 있나요?", src: "고용노동부" },
      { key: "living", slug: "settle-in", label: "생활", q: "한국 정착에 필요한 서류와 절차는?", src: "정부24" },
    ],

    communityLabel: "커뮤니티",
    communityTitle: "같은 길을 걷는 사람들",
    communityDesc:
      "수강생만의 공간입니다. 닉네임 옆에 들은 강의와 기수가 붙어, 같은 목표를 둔 사람을 바로 알아봅니다. 1기가 가장 오래 남긴 건 사람이었습니다.",
    communityStats: [
      { n: "8개국", l: "수강생 국적" },
      { n: "엔터 1기", l: "커뮤니티 개설" },
    ],
    communityGate: "수강 시작하면 열립니다",
    communityLockLabel: "수강생 전용",

    reviewsLabel: "1기 후기",
    reviewsTitle: { pre: "좋았던 것도 ", hi: "아쉬웠던 것도" },
    reviewsDesc:
      "8개국에서 온 1기 수강생들이 4주 과정을 마쳤습니다. 꾸미지 않은 실제 후기입니다",
    reviews: [
      { name: "다비", origin: "베트남", liked: "음향 수업이 제일 좋았어요. 공연 하나가 무대에 오르기까지 뒤에서 이렇게 많은 걸 준비하는지 그때 처음 알았거든요", wish: "실습이 조금만 더 많았으면 싶어요" },
      { name: "Martina", origin: "이탈리아", liked: "혼자였으면 절대 못 만났을 업계 사람들한테 직접 배우고 궁금한 걸 바로바로 물어본 게 제일 컸어요. 이력서랑 포트폴리오 피드백을 받고 나서야 용기 내서 지원을 시작했고요", wish: "너무 좋아서 오히려 아쉬웠어요. 콘서트 기획이나 글로벌 투어는 더 깊게 파보고 싶었거든요" },
      { name: "Aye Aye Khaing", origin: "미얀마", liked: "매주 K-pop 업계 이야기를 새로 듣는 게 재밌었어요. 뭘 준비해야 할지 막연했는데 이제 좀 그림이 그려져요", wish: "4주가 너무 빨리 지나갔어요. 실습이랑 네트워킹 시간이 더 있었으면" },
      { name: "Celine", origin: "필리핀", liked: "무대 뒤에서 음악이 실제로 어떻게 굴러가는지 눈으로 봤어요. 솔직히 이 수업 아니었으면 한국 회사에 지원할 엄두도 못 냈을 거예요", wish: "집이 관악구라 강의장까지 좀 멀긴 했어요. 그래도 배우는 게 좋아서 매번 갔지만요" },
    ],
    reviewWishLabel: "아쉬운 점 ",
    trustStats: [
      { n: "8개국", l: "수강생 국적" },
      { n: "4주 8회", l: "커리큘럼" },
    ],
    trustCta: "Fan to Pro 엔터 2기 바로가기",

    visionLabel: "비전",
    visionTitle: { pre: "교육에서 끝나지 않고 ", hi: "실제 커리어 기회" },
    visionDesc:
      "좋아하는 마음으로 한국에 온 사람들이 실무를 배우고, 유니온 픽처스 공연 프로젝트에서 실제 경험까지 쌓습니다. Growth Career가 그 길을 잇습니다",

    menuCommunity: "커뮤니티",
  },
  en: {
    heroEyebrow: "A career platform for internationals in Korea",
    heroH1: { l1: "The surest way to start", l2: "your career in Korea" },
    heroImgAlt: "Fan to Pro Cohort 1 on site",
    heroSub:
      "Start with Fan to Pro, our hands-on entertainment training, and find everything you need for life in Korea from visas to jobs, gathered from official sources in one place.",
    heroCtaPrimary: "Programs open now",
    heroCtaSecondary: "Browse insights",

    eduLabel: "Fan to Pro",
    eduTitle: { pre: "Turn what you love into ", hi: "real experience" },
    eduDesc:
      "Fan to Pro is hands-on job training for the entertainment industry. You learn how the work really happens backstage, straight from the people who do it.",
    eduCohortTag: "Open now",
    eduCohortTitle: { pre: "Fan to Pro Ent ", hi: "Cohort 2" },
    eduCohortCta: "See Cohort 2",
    tracks: [
      { domain: "A&R course", status: "Cohort 2 open", live: true, cta: "See the idol and live show work" },
      { domain: "Sound course", status: "Cohort 2 open", live: true, cta: "See live sound work" },
      { domain: "All-in-one", status: "Cohort 2 open", live: true, cta: "Both courses and the show project" },
    ],

    insightLabel: "Insights",
    insightTitle: { pre: "Life in Korea, made clear with ", hi: "official sources" },
    insightDesc:
      "Visas, TOPIK, Korean, banking, jobs. We only cover material from official agencies like the Ministry of Foreign Affairs, immigration, and the National Institute for International Education. Nothing unverified goes in.",
    insight: [
      { key: "visa", slug: "visa-info", label: "Visa", q: "How do I extend a D-2 student visa?", src: "HiKorea Immigration" },
      { key: "topik", slug: "topik-2026", label: "TOPIK", q: "What is the 2026 TOPIK schedule and how do I register?", src: "NIIED" },
      { key: "korean", slug: "free-korean", label: "Korean", q: "Where can I learn Korean for free?", src: "King Sejong Institute" },
      { key: "finance", slug: "bank-account", label: "Banking", q: "How can a foreigner open a bank account?", src: "Financial Supervisory Service" },
      { key: "work", slug: "part-time-work", label: "Work", q: "Can international students work part-time?", src: "Ministry of Employment and Labor" },
      { key: "living", slug: "settle-in", label: "Living", q: "What paperwork do I need to settle in Korea?", src: "Government24" },
    ],

    communityLabel: "Community",
    communityTitle: "People walking the same path",
    communityDesc:
      "A space just for students. Each nickname carries the classes and cohort someone took, so you spot people with the same goal right away. What Cohort 1 left behind most was the people.",
    communityStats: [
      { n: "8 countries", l: "Student nationalities" },
      { n: "Ent Cohort 1", l: "Community opened" },
    ],
    communityGate: "Opens when you enroll",
    communityLockLabel: "Students only",

    reviewsLabel: "Cohort 1 reviews",
    reviewsTitle: { pre: "The good parts, ", hi: "and the letdowns" },
    reviewsDesc:
      "Students from 8 countries finished the 4-week program. These are their real, unedited reviews.",
    reviews: [
      { name: "Davi", origin: "Vietnam", liked: "The sound class was my favorite. That was the first time I realized how much gets prepared behind the scenes before a single show reaches the stage", wish: "I wish there had been a bit more hands-on practice" },
      { name: "Martina", origin: "Italy", liked: "The biggest thing for me was learning straight from industry people I would never have met on my own, and getting my questions answered on the spot. It was only after the resume and portfolio feedback that I found the nerve to start applying", wish: "It was so good that it left me wanting more. I would have loved to dig deeper into concert planning and global tours" },
      { name: "Aye Aye Khaing", origin: "Myanmar", liked: "I loved hearing something new about the K-pop industry every week. I had no idea what to prepare for, and now I can picture it", wish: "The 4 weeks went by too fast. I wish there had been more time for practice and networking" },
      { name: "Celine", origin: "Philippines", liked: "I saw with my own eyes how the music actually runs behind the stage. Honestly, without this class I never would have had the courage to apply to a Korean company", wish: "I live in Gwanak-gu, so the venue was a bit far. I went every time anyway because I loved learning" },
    ],
    reviewWishLabel: "Room to improve ",
    trustStats: [
      { n: "8 countries", l: "Student nationalities" },
      { n: "8 sessions in 4 weeks", l: "Curriculum" },
    ],
    trustCta: "Go to Fan to Pro Ent Cohort 2",

    visionLabel: "Vision",
    visionTitle: { pre: "Not ending at training, but leading to ", hi: "real career chances" },
    visionDesc:
      "A path where people who came to Korea for something they love learn the craft and gain real experience on Union Pictures live show projects. Growth Career connects the two.",

    menuCommunity: "Community",
  },
};

const FEED = [
  { nick: "trang_v", bars: [88, 60] },
  { nick: "martina.r", bars: [72, 90, 44] },
  { nick: "celine_s", bars: [80, 52] },
  { nick: "aye_k", bars: [66, 84, 48] },
];

export default async function GcHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = COPY[locale === "ko" ? "ko" : "en"];
  const prefix = locale === "ko" ? "/ko" : "";
  const cohortBadge = locale === "ko" ? "엔터 1기" : "Ent Cohort 1";

  return (
    <main className="min-h-screen break-keep bg-white text-[#191F28]">
      {/* ===== GNB (공통 SiteHeader, 라이트 variant. 언어 스위처 편입) ===== */}
      <SiteHeader
        brand={<GcWordmark variant="light-clean" href={`${prefix}/`} />}
        menu={[
          ...gcNavBefore(prefix),
          { label: t.menuCommunity, node: <CommunityGate /> },
          ...gcNavAfter(prefix),
        ]}
        actions={<GcHeaderCta prefix={prefix} />}
      />

      {/* ===== HERO (좌측 정렬. 데스크탑 2컬럼 텍스트 좌 / 이미지 우.
           모바일 세로 순서 = eyebrow → headline → 이미지 → 설명 → CTA (컴포지션 룰 A).
           grid 명시 배치로 모바일 DOM 순서 유지하면서 데스크탑은 이미지를 우측 컬럼으로) ===== */}
      <section className={`${WRAP} pt-14 pb-20 sm:pt-20`}>
        <div className="grid gap-y-7 lg:grid-cols-[1fr_1.15fr] lg:items-center lg:gap-x-14">
          <p className={`${styles.reveal} font-bold text-[15px] text-brand-pink lg:col-start-1 lg:row-start-1 lg:self-end`}>
            {t.heroEyebrow}
          </p>
          <h1 className={`${styles.reveal} text-balance font-black text-[#191F28] lg:col-start-1 lg:row-start-2`} style={{ ...HEAD, fontSize: "clamp(2.1rem, 4.6vw, 3.6rem)", animationDelay: "0.05s" }}>
            {t.heroH1.l1}
            <br />
            <span className="text-brand-pink">{t.heroH1.l2}</span>
          </h1>
          <div className={`${styles.reveal} relative aspect-[16/9] w-full overflow-hidden rounded-2xl lg:col-start-2 lg:row-start-2 lg:row-span-3 lg:aspect-auto lg:h-full lg:self-stretch`} style={{ animationDelay: "0.1s" }}>
            {/* Supabase Storage = 원격 호스트. next.config 미설정이라 plain img. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${MEDIA}/cohort-1/IMG_6076.jpg`} alt={t.heroImgAlt} className="absolute inset-0 h-full w-full object-cover" />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>
          <p className={`${styles.reveal} max-w-md text-[17px] text-[#4E5968] leading-relaxed lg:col-start-1 lg:row-start-3`} style={{ animationDelay: "0.16s" }}>
            {t.heroSub}
          </p>
          {/* CTA: primary(전환) 핑크 solid → 교육, secondary(유입) 남보라 outline → 인사이트 */}
          <div className={`${styles.reveal} flex flex-col gap-3 sm:flex-row lg:col-start-1 lg:row-start-4 lg:self-start`} style={{ animationDelay: "0.22s" }}>
            <Button variant="pink-solid" href={`${prefix}/fan-to-pro/2`} className="px-6 py-3.5 text-[15px]">
              {t.heroCtaPrimary} <span aria-hidden>→</span>
            </Button>
            <Button variant="indigo-outline" href="#insight" className="px-6 py-3.5 text-[15px]">
              {t.heroCtaSecondary}
            </Button>
          </div>
        </div>
      </section>

      {/* ===== 교육 (배경 연회색 — 히어로 흰색과 구분) ===== */}
      <section id="education" className="scroll-mt-20 bg-[#F7F8FA] py-20">
        <div className={WRAP}>
        <SectionHeader
          label={t.eduLabel}
          title={
            <>
              {t.eduTitle.pre}<span className="text-brand-pink">{t.eduTitle.hi}</span>
            </>
          }
          description={t.eduDesc}
        />

        {/* 2기 하이라이트 */}
        <Card variant="clean" href={`${prefix}/fan-to-pro/2`} className="group mt-9 block overflow-hidden">
          <div className="grid gap-0 sm:grid-cols-[1fr_320px]">
            <div className="flex flex-col justify-center p-8 sm:p-10">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-pink/10 px-3 py-1 font-bold text-sm text-brand-pink">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-pink" /> {t.eduCohortTag}
              </span>
              <h3 className="mt-4 text-balance font-black text-[26px] text-[#191F28] sm:text-[32px]" style={HEAD}>
                {t.eduCohortTitle.pre}<span className="text-brand-pink">{t.eduCohortTitle.hi}</span>
              </h3>
              <span className="mt-7 inline-flex items-center gap-2 rounded-xl bg-brand-pink px-6 py-3.5 font-bold text-[16px] text-white transition-transform duration-150 group-hover:translate-x-0.5">
                {t.eduCohortCta} <span aria-hidden>→</span>
              </span>
            </div>
            <div className="relative hidden min-h-[220px] sm:block">
              <Image src="/images/stock/boy-group-concert-stage-2.jpg" alt="" fill sizes="320px" className="object-cover" />
            </div>
          </div>
        </Card>

        {/* 트랙 3장 — 비대칭: 라이브(K엔터) 넓고 밝게, 예정은 좁고 dim */}
        <div className="mt-4 grid gap-4 md:grid-cols-[1.5fr_1fr_1fr]">
          {t.tracks.map((track) => (
            <Card
              key={track.domain}
              variant="clean"
              href={track.live ? `${prefix}/fan-to-pro/2` : undefined}
              className={`group flex flex-col justify-between p-6 sm:p-7 ${track.live ? "" : "opacity-55"}`}
            >
              <div>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-bold text-sm ${track.live ? "bg-brand-pink/10 text-brand-pink" : "bg-[#F2F4F6] text-[#8B95A1]"}`}>
                  {track.live ? <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-brand-pink" /> : null}
                  {track.status}
                </span>
                <h4 className="mt-4 font-black text-[#191F28] text-xl">{track.domain}</h4>
                <p className="mt-1 text-[#8B95A1] text-sm">Fan to Pro</p>
              </div>
              {track.live ? (
                <span className="mt-8 inline-flex items-center gap-1.5 font-bold text-[15px] text-brand-pink transition-transform duration-150 group-hover:translate-x-0.5">
                  {track.cta} <span aria-hidden>→</span>
                </span>
              ) : null}
            </Card>
          ))}
        </div>
        </div>
      </section>

      {/* ===== 인사이트 (배경 흰색 — 교육 회색과 구분) ===== */}
      <section id="insight" className="scroll-mt-20 py-20">
        <div className={WRAP}>
          <SectionHeader
            label={t.insightLabel}
            title={
              <>
                {t.insightTitle.pre}<span className="text-brand-pink">{t.insightTitle.hi}</span>
              </>
            }
            description={t.insightDesc}
          />

          {/* 카테고리 (섹션 상단 = 표준 위치) */}
          <div className="mt-7 flex flex-wrap items-center gap-2">
            {t.insight.map((c) => (
              <a key={c.key} href={`${prefix}/insight/${c.slug}`} className="rounded-full border border-[#EDEFF2] bg-[#F7F8FA] px-3.5 py-1.5 font-medium text-[#4E5968] text-sm transition-colors duration-150 hover:border-brand-pink hover:text-brand-pink">
                {c.label}
              </a>
            ))}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {t.insight.map((c, idx) => {
              const feature = idx === 0; // 비자 = 수요 1위, 피처 크게
              return (
                <Card
                  key={c.key}
                  variant="clean"
                  href={`${prefix}/insight/${c.slug}`}
                  className={`group relative block overflow-hidden ${feature ? "aspect-[4/3] sm:col-span-2 sm:row-span-2 sm:aspect-auto" : "aspect-[4/3]"}`}
                >
                  <Image src={`/images/insight/${c.key}.jpg`} alt="" fill sizes={feature ? "(min-width: 1024px) 760px, 100vw" : "(min-width: 1024px) 370px, 50vw"} className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                  {/* 단색 검정 딤 (하단 진하게) */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/5" />
                  <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 font-bold text-[#191F28] text-sm">
                    {c.label}
                  </span>
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <p className={`font-bold text-white leading-snug ${feature ? "max-w-md text-[20px] sm:text-[26px]" : "text-[15px]"}`}>{c.q}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm text-white/70">{c.src}</span>
                      <span aria-hidden className="text-white transition-transform duration-150 group-hover:translate-x-0.5">→</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== 커뮤니티 티저 (배경 연회색) ===== */}
      <section id="community" className="scroll-mt-20 bg-[#F7F8FA] py-20">
        <div className={WRAP}>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-16">
          <div>
            <SectionHeader
              label={t.communityLabel}
              title={t.communityTitle}
              description={t.communityDesc}
            />
            {/* 멤버 소셜프루프 — 닫힌 문 뒤에 사람이 있다는 신호 */}
            <div className="mt-7 flex items-center gap-7">
              {t.communityStats.map((s) => (
                <div key={s.l}>
                  <p className="font-black text-[#191F28] text-xl">{s.n}</p>
                  <p className="mt-0.5 text-[#8B95A1] text-sm">{s.l}</p>
                </div>
              ))}
            </div>
            <CommunityGate triggerClassName="mt-7 inline-flex items-center gap-2 rounded-full bg-[#F2F4F6] px-3.5 py-1.5 font-medium text-[#4E5968] text-sm transition-colors duration-150 hover:bg-[#E8EBED]">
              <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-brand-pink" />
              {t.communityGate}
            </CommunityGate>
          </div>

          <Card variant="clean" className="relative overflow-hidden p-6 sm:p-7">
            <div className="space-y-5" aria-hidden>
              {FEED.map((f) => (
                <div key={f.nick} className="flex gap-3">
                  <span className="mt-0.5 h-9 w-9 shrink-0 rounded-full bg-[#F2F4F6]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#191F28] text-sm">{f.nick}</span>
                      <span className="rounded-full bg-brand-pink/10 px-2 py-0.5 font-bold text-sm text-brand-pink">{cohortBadge}</span>
                    </div>
                    <div className="mt-2.5 flex flex-col gap-1.5">
                      {f.bars.map((w, i) => (
                        <span key={i} className={styles.redact} style={{ width: `${w}%` }} />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-center bg-gradient-to-t from-white via-white/85 to-transparent pt-16 pb-6">
              <span className="inline-flex items-center gap-2 rounded-xl border border-[#EDEFF2] bg-white px-4 py-2.5 font-bold text-[#333D4B] text-sm shadow-[0_4px_16px_-6px_rgba(17,24,39,0.15)]">
                <LockGlyph /> {t.communityLockLabel}
              </span>
            </div>
          </Card>
        </div>
        </div>
      </section>

      {/* ===== 1기 후기 (배경 흰색) ===== */}
      <section className="py-20">
        <div className={WRAP}>
          <SectionHeader
            label={t.reviewsLabel}
            title={
              <>
                {t.reviewsTitle.pre}<span className="text-brand-pink">{t.reviewsTitle.hi}</span>
              </>
            }
            description={t.reviewsDesc}
          />

          <div className="mt-12 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
            {/* 피처 인용 — 가장 강력한 후기(Martina) 크게 */}
            <Card variant="clean" as="figure" className="relative flex flex-col justify-center overflow-hidden p-8 pl-10 sm:p-10 sm:pl-12">
              {/* 대표 인용 표식 — 좌측 핑크 solid accent bar (§6.8) */}
              <span aria-hidden className="absolute inset-y-8 left-0 w-1 rounded-full bg-brand-pink sm:inset-y-10" />
              <blockquote className="text-[#191F28] text-[19px] leading-relaxed sm:text-[23px]">{t.reviews[1].liked}</blockquote>
              <figcaption className="mt-6">
                <span className="font-bold text-[#191F28]">{t.reviews[1].name}</span>
                <span className="ml-1.5 text-[#8B95A1] text-sm">{t.reviews[1].origin}</span>
                <p className="mt-2 text-[#8B95A1] text-sm leading-relaxed">
                  <span className="font-bold text-[#6B7684]">{t.reviewWishLabel}</span>
                  {t.reviews[1].wish}
                </p>
              </figcaption>
            </Card>
            {/* 사이드 3개 — 작게 stacked */}
            <div className="grid gap-4">
              {t.reviews.filter((_, i) => i !== 1).map((r) => (
                <Card key={r.name} variant="clean" as="figure" className="p-6">
                  <blockquote className="text-[#191F28] text-sm leading-relaxed">{r.liked}</blockquote>
                  <figcaption className="mt-3 text-sm">
                    <span className="font-bold text-[#191F28]">{r.name}</span>
                    <span className="ml-1.5 text-[#8B95A1]">{r.origin}</span>
                  </figcaption>
                </Card>
              ))}
            </div>
          </div>

          {/* 신뢰 스트립 (핑크 solid) + 2기 CTA */}
          <div className="mt-4 flex flex-col gap-7 rounded-2xl bg-brand-pink px-8 py-8 text-white sm:flex-row sm:items-center sm:justify-between sm:px-10 sm:py-9">
            <div className="flex items-center gap-8">
              {t.trustStats.map((s) => (
                <div key={s.l}>
                  <p className="font-black text-2xl sm:text-3xl">{s.n}</p>
                  <p className="mt-0.5 text-white/75 text-sm">{s.l}</p>
                </div>
              ))}
            </div>
            <Button
              variant="subtle"
              href={`${prefix}/fan-to-pro/2`}
              className="shrink-0 bg-white px-7 py-4 text-[17px] text-brand-pink hover:bg-white/90"
            >
              {t.trustCta} <span aria-hidden>→</span>
            </Button>
          </div>
        </div>
      </section>

      {/* ===== 커리어 비전 티저 ===== */}
      <section id="gc-vision" className={`${WRAP} py-24`}>
        <div className="rounded-3xl bg-[#FDF2F8] px-8 py-12 sm:px-16 sm:py-16">
          <SectionHeader
            label={t.visionLabel}
            title={
              <>
                {t.visionTitle.pre}<span className="text-brand-pink">{t.visionTitle.hi}</span>
              </>
            }
            description={t.visionDesc}
          />
        </div>
      </section>

      {/* ===== Footer (공통 라이트 SiteFooter, GC 사이트 구조 nav 주입) ===== */}
      <SiteFooter nav={gcFooterNav(prefix)} />
    </main>
  );
}

function LockGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <rect x="4" y="11" width="16" height="9" rx="1.5" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}
