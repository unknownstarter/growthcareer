/**
 * Press (보도자료) 공유 도메인.
 *
 * 2기 모집 페이지에 하드코딩돼 있던 PRESS_META 3건 + content.ts 의 press 제목/설명을
 * 여기로 합쳐 단일 소스로 승격. 2기 페이지와 신규 /press 리스트 페이지가 함께 import.
 *
 * 표시 순서 = 최신 위로 (배열 그대로).
 * 외부 기사 (PEOPLEGATE) 라 url 은 target="_blank" 로 연다.
 */

const MEDIA =
  "https://rykqzenbjcggzrruryeq.supabase.co/storage/v1/object/public/cohort-media";

export type PressArticle = {
  /** 16:9 썸네일 (Supabase cohort-media press/*.webp) */
  thumb: string;
  /** 매체명 */
  outlet: string;
  /** 발행일 */
  date: string;
  /** 외부 기사 URL */
  url: string;
  titleKo: string;
  titleEn: string;
  descKo: string;
  descEn: string;
};

export const PRESS_ARTICLES: PressArticle[] = [
  {
    thumb: `${MEDIA}/press/press-1.webp`,
    outlet: "PEOPLEGATE",
    date: "2026.07.25",
    url: "https://www.peoplegate.co.kr/2026/07/dropdown-deepi-kculture-academy-2026.html",
    titleKo: "외국인 유학생이 K-컬처 산업으로. 드롭다운과 DEEPI, 'K컬처 아카데미' 1기 수료생 배출",
    descKo: "1개월 교육을 마치고 첫 수료생을 배출. K-팝, 공연, 패션, 뷰티 등 산업 실무 중심의 글로벌 인재 양성 프로그램.",
    titleEn: "International students into K-culture. Dropdown and DEEPI graduate the first 'K-Culture Academy' cohort",
    descEn: "The first graduates complete a one-month program. A global talent program centered on K-pop, live production, fashion, and beauty.",
  },
  {
    thumb: `${MEDIA}/press/press-2.webp`,
    outlet: "PEOPLEGATE",
    date: "2026.07",
    url: "https://www.peoplegate.co.kr/2026/07/kculture-academy-dropdown-deepi-unionpictures-2026.html",
    titleKo: "드롭다운과 DEEPI, 'K컬처 아카데미' 강사 공개 모집. K-팝, 뷰티, 패션 실무 전문가 찾는다",
    descKo: "K-컬처 커리어 플랫폼 드롭다운과 DEEPI가 K-팝, K-뷰티, 패션 등 다양한 분야의 실무 전문가를 대상으로 강사를 공개 모집.",
    titleEn: "Dropdown and DEEPI open a public call for 'K-Culture Academy' instructors, seeking K-pop, beauty, and fashion experts",
    descEn: "K-culture career platform Dropdown and DEEPI open a public call for working experts across K-pop, K-beauty, fashion, and more.",
  },
  {
    thumb: `${MEDIA}/press/press-3.webp`,
    outlet: "PEOPLEGATE",
    date: "2026.05",
    url: "https://www.peoplegate.co.kr/2026/05/unionpictures-dropdown-growthcareer-kpop-entertainment-bootcamp-global-students-2026.html",
    titleKo: "드롭다운, 외국인 유학생 위한 엔터테인먼트 취업 부트캠프 6월 개강",
    descKo: "K-POP 산업의 글로벌 확장에 맞춰 '팬에서 프로로' 실무 중심 부트캠프 등장. 실제 K-POP 공연 프로젝트 참여로 경력을 쌓도록 설계.",
    titleEn: "Dropdown opens an entertainment job bootcamp for international students in June",
    descEn: "A hands-on 'fan to pro' bootcamp arrives amid the global expansion of K-POP. Built so students build a career through real K-POP production projects.",
  },
];

/** locale 별 제목/설명 접근 헬퍼. */
export function pressTitle(a: PressArticle, locale: string): string {
  return locale === "ko" ? a.titleKo : a.titleEn;
}

export function pressDesc(a: PressArticle, locale: string): string {
  return locale === "ko" ? a.descKo : a.descEn;
}
