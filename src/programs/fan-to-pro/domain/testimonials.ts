/**
 * Testimonials — 동일 커리큘럼으로 진행된 이전 강의 수강생 인터뷰 발췌 (변형·익명화).
 * Sage 규칙: 풀네임 금지, 이니셜 + 국적 + 지망 직군만. 디스클로저 의무.
 */
export type Testimonial = {
  id: string;
  initial: string;
  age: number;
  nationality: string;
  aspiration: string;
  quote: string;
};

export const TESTIMONIALS: readonly Testimonial[] = [
  {
    id: "t-01",
    initial: "L.",
    age: 27,
    nationality: "베트남",
    aspiration: "K-pop 작곡 지망",
    quote:
      "한국 와서 처음으로 *공연이 어떻게 굴러가는지* 안에서 봤다. 학교에선 안 가르쳐주는 진짜 흐름.",
  },
  {
    id: "t-02",
    initial: "M.",
    age: 24,
    nationality: "인도네시아",
    aspiration: "비주얼 디렉터 지망",
    quote:
      "포트폴리오에 *실제 무대 영상*이 들어간 게 가장 컸다. 면접에서 멘토 이름 한 줄이 통했다.",
  },
  {
    id: "t-03",
    initial: "K.",
    age: 26,
    nationality: "중국",
    aspiration: "공연 기획 지망",
    quote:
      "비자 상태가 모호해서 망설였는데, 멘토가 케이스별로 정리해줬다. 그게 결정타.",
  },
  {
    id: "t-04",
    initial: "S.",
    age: 25,
    nationality: "태국",
    aspiration: "음향 엔지니어 지망",
    quote:
      "혼자 유튜브로만 공부할 땐 막막했다. 한 시즌 옆에서 보고 직접 만지니 *내 손에 잡혔다*.",
  },
  {
    id: "t-05",
    initial: "A.",
    age: 28,
    nationality: "러시아",
    aspiration: "엔터 마케팅 지망",
    quote:
      "동기들이랑 카톡방에서 매일 정보 공유한다. 시즌 끝났는데 더 가까워짐.",
  },
  {
    id: "t-06",
    initial: "P.",
    age: 23,
    nationality: "필리핀",
    aspiration: "K-pop 안무 지망",
    quote:
      "한국어 부족해도 멘토가 영어 섞어서 코칭해줬다. 진짜 *포기 안 시켜준다*.",
  },
] as const;

export const TESTIMONIAL_DISCLOSURE =
  "이전에 진행된 동일 커리큘럼 강의 수강생 인터뷰 발췌 (개인정보 보호를 위해 익명화·요약했습니다). 만족도 점수는 해당 강의 종료 설문 기준이며, 정확한 표본 수는 결과 정리 완료 시 갱신.";

export const SATISFACTION = {
  score: "4.9",
  max: "5.0",
  sampleSize: null as number | null,
} as const;
