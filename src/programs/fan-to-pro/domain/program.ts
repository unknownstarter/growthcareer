/**
 * Program — 프로그램 구성, 멘토, 보장 항목.
 * 일부 필드는 사용자 입력 대기 (null / TBD).
 */
export const GUARANTEES = [
  {
    id: "portfolio",
    title: "포트폴리오",
    body: "현장에서 검증된 결과물. 면접관이 신뢰하는 형식으로 정리.",
  },
  {
    id: "network",
    title: "업계 네트워킹",
    body: "현직 멘토 3인 + 동기. 끝나도 카카오톡 오픈채팅으로 이어진다.",
  },
  {
    id: "certificate",
    title: "수료증",
    body: "유니온 픽처스 발급. 이력서에 한 줄 추가되는 신뢰 신호.",
  },
] as const;

export const CAREER_SUPPORT = [
  "이력서 코칭",
  "포트폴리오 큐레이션",
  "면접 시뮬레이션",
] as const;

/**
 * 학원법 시행령 별표 4 + 공정위 소비자분쟁해결기준(교육서비스) 기준.
 * 1개월 이내 강좌의 의무 환불 비율을 그대로 따른다.
 * 추가로 전자상거래법 §17 청약철회권(결제 후 7일)을 명시적으로 보장.
 */
export const REFUND_POLICY = {
  fullRefundDays: 7,
  fullRefundLabel: "결제 후 7일 이내 또는 수강 시작 전 100% 환불",
  schedule: [
    { phase: "결제 후 7일 이내", refund: "100%" },
    { phase: "수강 시작 전", refund: "100%" },
    { phase: "수강 시작 후 1/3 경과 전", refund: "2/3 환불" },
    { phase: "수강 시작 후 1/2 경과 전", refund: "1/2 환불" },
    { phase: "1/2 경과 후", refund: "환불 없음" },
  ] as const,
  legalBasis:
    "학원의 설립·운영 및 과외교습에 관한 법률 시행령 별표 4 · 공정위 소비자분쟁해결기준",
} as const;

/**
 * 모집 정원 가드. 시작일 7일 전 시점 신청자 < 최소 인원이면 강좌를 취소하고 전액 자동 환불.
 */
export const ENROLLMENT_CAP = {
  totalSeats: 30,
  minToProceed: 20,
  cutoffDaysBeforeStart: 7,
  autoRefundNote:
    "본 강좌는 총 30인 모집이며, 수강 시작일 7일 전 시점에 신청자가 20명 미만이면 강좌가 취소되고 결제 금액은 전액 자동 환불됩니다.",
} as const;

export const CERTIFICATE_ISSUER = {
  name: "유니온 픽처스",
  nameEn: "Union Pictures",
} as const;

export const COMMUNITY = {
  channel: "카카오톡 오픈채팅" as const,
  joinTimingNote: "수강 확정 시 안내",
} as const;

export type CareerGroup = {
  label: string;
  items: readonly string[];
};

export type Instructor = {
  id: string;
  day: "토요일" | "일요일";
  name: string;
  nameSub: string | null;
  affiliation: readonly string[];
  oneLiner: string;
  photo: string;
  photoAlt: string;
  curriculum: readonly string[];
  careerGroups: readonly CareerGroup[];
};

export const INSTRUCTORS: readonly Instructor[] = [
  {
    id: "oh-beomjun",
    day: "토요일",
    name: "오범준",
    nameSub: null,
    affiliation: ["유니온픽쳐스 소속감독", "레솔트뮤지끄 음악감독"],
    oneLiner:
      "광고와 방송 음악감독으로 입봉, 현재 여러 아티스트의 공연 음향과 콘서트 진행을 맡고 있습니다.",
    photo: "/images/instructors/oh-beomjun.jpg",
    photoAlt: "오범준 강사 프로필",
    curriculum: [
      "공연 제작 구조 이해",
      "음악 디렉팅 · 편곡 실무",
      "플레이백 · 타임코드 개론",
      "현장 실무 · 커리어",
    ],
    careerGroups: [
      {
        label: "광고 음악",
        items: [
          "티머니 모바일 (박보영) 작곡",
          "신한증권 (장나라) 징글 작곡",
          "코웨이 (아이콘) 작곡",
          "VOGO 라이브쇼핑 (돌고래유괴단 · 김범수) 편곡",
          "셀렉스 (정동원) 작곡",
          "뉴트리원 더생알파 (임영웅) 작곡",
          "LG Waschmaschine (독일 · 유럽) 작곡",
          "Blackpink × Tokopedia (인도네시아) 작곡",
          "설화수 자음생 작곡",
          "아큐브 디파인 작곡",
        ],
      },
      {
        label: "드라마 · 방송",
        items: [
          "채널A 〈무물쭈물〉 OST 작곡",
          "2026 KIA BOOTCAMP WORLDWIDE 음악감독",
          "Modoofind — The Beginning / First Flight / Go Higher 작곡",
        ],
      },
      {
        label: "콘서트",
        items: [
          "2025 손동운 콘서트 — 음악감독팀",
          "2026 더보이즈 콘서트 — 음향팀",
          "2026 QQQ (KB · 지성 · NINE) 한국 투어 — 진행팀",
        ],
      },
    ],
  },
  {
    id: "nino-lee",
    day: "일요일",
    name: "Nino",
    nameSub: "이세환",
    affiliation: ["Sherpa Music CEO", "Creative Director"],
    oneLiner:
      "1999년 1세대 언더래퍼로 시작해 소니뮤직, CJ E&M 을 거쳐 현재 Sherpa Music Creative Director 로 27년째 뮤직 비즈니스를 하고 있습니다.",
    photo: "/images/instructors/nino-lee.jpg",
    photoAlt: "Nino (이세환) 강사 프로필",
    curriculum: [
      "Music Business",
      "음반 기획 · 제작 전략",
      "A&R",
      "Visual Director",
    ],
    careerGroups: [
      {
        label: "CJ ENM A&R",
        items: [
          "프로듀스 101 시즌1 · 2 · X · Japan 시즌1 · 2",
          "프로듀스 48",
          "I.O.I — 미니 1·2집 / 싱글 1·2집",
          "JBJ — 미니 1·2집 / 디럭스 1집",
          "워너원 미니 1집 [1×1=1]",
          "아이즈원 — 미니 1·2·3·4집 / 정규 1집 [Bloom*IZ]",
          "JO1 (Japan) — 미니 1·2·3집 / 정규 1집 [The STAR]",
          "INI — 미니 1·2·3집",
          "중국 청춘유니2 타이틀 [YES! OK!]",
        ],
      },
      {
        label: "HI-HAT Producer · Publishing",
        items: [
          "키스식스센스 OST Producer",
          "변론을 시작하겠습니다 OST Producer",
          "카지노 OST Producer",
          "사랑이라 말해요 OST Producer",
          "남남 OST Producer",
          "트랜드지 3·4집 Producer",
          "국내외 100여팀 작가 계약",
          "비비지 · 황민현 · 소유 · 템페스트 · 보이즈플래닛 · 트랜드지 곡 셀링",
        ],
      },
      {
        label: "Sherpa Music CEO · Creative Director",
        items: [
          "STARSHIP New Kids On The STARSHIP A&R",
          "JTBC Project7 해외 연습생 오디션 — 1위 마징시앙 데뷔",
          "이승윤 3rd Album Visual Director — 2025 한국대중음악상 2관왕",
          "Sherpa Music Publishing 국내외 290여팀 작가 계약",
        ],
      },
    ],
  },
] as const;
