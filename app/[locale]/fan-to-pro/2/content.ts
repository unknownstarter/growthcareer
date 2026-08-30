/**
 * F2P 2기 프리뷰 이중언어 콘텐츠 (ko / en).
 * 프리뷰가 [locale] 라우트라 layout 의 LocaleSwitcher(/ko↔/en)에 반응해야 함.
 * 하드코딩 한국어 → 이 딕셔너리로 교체. locale 별 t 를 page + client 컴포넌트에 전달.
 * 아이돌 정식명 금지, 미정값은 "확정 예정 / TBD". 부호 §6.5 준수.
 */
export type Locale = "ko" | "en";

export type CourseOpt = {
  slug: string;
  title: string;
  meta: string;
  status: "confirmed" | "pending";
  price: number | null;
};

const CONTENT = {
  ko: {
    nav: { instructors: "강사진", program: "프로그램", courses: "과정", press: "Press Room", archive: "1기 아카이브", apply: "수강 신청하기", stickyLead: "지금, 팬에서 프로로" },
    hero: {
      status: "> NOW_CASTING --cohort=02 --track=k_ent",
      line1a: "팬에서 ", line1b: "프로", line1c: "로",
      line2: "무대 뒤의 커리어",
      desc: "국내 최대 아이돌 오디션 프로그램과 글로벌 아이돌 그룹을 기획한 A&R 디렉터가 직접 가르칩니다. 강의실에서 끝나지 않고, 실제 공연 프로젝트에 참여해 포트폴리오가 되는 경험을 남깁니다",
      location: "서울 현장 오프라인 강의 - 한국 거주 중인 외국인 유학생 대상",
      ctaApply: "2기 신청하기", ctaInstructors: "강사진 먼저 보기",
    },
    nodes: { fan: "팬", lecture: "강의", experience: "경험", expert: "전문가", career: "취업" },
    instructors: {
      cmd: "whois instructors", label: "강사진",
      h1: "현업이 가르칩니다", h2: "이력서로 증명된 사람들",
      people: [
        {
          whois: "nino", badge: "A&R 단과 확정", role: "A&R 디렉터",
          photo: "/images/instructors/nino-lee.jpg",
          displayName: "Nino", subName: "이세환",
          aff: ["Sherpa Music CEO", "27년차 뮤직 비즈니스"],
          credits: [
            { label: "메이저 엔터사 A&R", items: ["국내 최대 규모 아이돌 오디션 프로그램 시리즈", "글로벌 데뷔 아이돌 그룹 다수 음반 기획", "한국과 일본 아이돌 프로젝트 A&R 총괄"] },
            { label: "Sherpa Music CEO", items: ["음원 기획 및 아티스트 비주얼 디렉팅", "음악 시상식 수상 아티스트 프로젝트", "국내외 290여 팀 작가 계약 총괄"] },
          ],
        },
        {
          whois: "choi", badge: "음향 감독 단과 확정", role: "음향 시스템 감독",
          photo: "/images/instructors/choi-chanyong-live-sound.jpg",
          displayName: "최찬용", subName: "Choi Chanyong",
          aff: ["E.K Ent. 실장", "라이브 사운드 엔지니어"],
          credits: [
            { label: "라이브 사운드 감독", items: ["팝페라, 오케스트라, 밴드 전담 음향감독", "방송사, 공공기관, 기업 VIP 행사 음향 운영", "국내외 공연 투어 프로덕션 기술 지원과 아티스트 케어"] },
            { label: "주요 공연", items: ["국제 음악 페스티벌", "오케스트라 정기 공연", "기업 오페라 콘서트 등 다수"] },
          ],
        },
      ],
      note: "강사 섭외 및 운영 협력 DEEPI. 2기 강사 구성은 확정 순서대로 공개됩니다",
    },
    program: {
      cmd: "cat program.md", label: "프로그램",
      h1: "배우는 게 아니라,", h2: "이미 일하는 것처럼",
      p1: "Fan to Pro는 K엔터 산업의 실무를 그대로 옮겨온 교육입니다. 현장에서 바로 쓰는 워크플로우와 문서, 툴을 다룹니다",
      p2: "핵심은 실제 프로젝트입니다. 수료생은 유니온 픽처스의 실제 공연 제작 과정에 참여해 포트폴리오용 경험을 쌓고, 참여 확인서를 받습니다",
      p3: "수료증은 Dropdown 명의로 발급됩니다. 이력서에 한 줄 더해지는 신뢰 신호입니다",
    },
    curriculum: {
      cmd: "ls curriculum/", label: "커리큘럼", h1: "무엇을 배우나",
      desc: "단과 두 과정 모두 4주 커리큘럼입니다. 올인원은 두 과정을 모두 수강합니다",
      weekLabel: "주차",
      courses: [
        {
          slug: "a-r", title: "A&R 단과반", day: "일요일 오후 2시~4시", mentor: "Nino",
          weeks: [
            { theme: "뮤직 비즈니스", desc: "음악 산업의 구조와 비즈니스 기본기" },
            { theme: "음반 기획과 제작 전략", desc: "기획부터 발매까지 제작 전략의 흐름" },
            { theme: "A&R 실무", desc: "캐스팅, 곡 수급, 아티스트 디렉팅" },
            { theme: "Visual Directing", desc: "아티스트 비주얼과 콘셉트 디렉팅" },
          ],
        },
        {
          slug: "sound", title: "음향 감독 단과반", day: "토요일 오전 10시~12시", mentor: "최찬용",
          weeks: [
            { theme: "Inside a K-POP Concert", desc: "공연 하루의 흐름과 백스테이지 역할을 이해합니다" },
            { theme: "What Does the Artist Hear?", desc: "IEM을 착용하고 아티스트 모니터 환경을 직접 체험합니다" },
            { theme: "Talkback & Communication", desc: "아티스트와 엔지니어의 실시간 소통과 상황 대응" },
            { theme: "Experience a K-POP Show", desc: "PA와 IEM, 역할 분담으로 미니 공연을 함께 만듭니다" },
          ],
        },
      ],
    },
    courses: {
      cmd: "ls courses/", label: "과정", h1: "필요한 만큼만. 또는 전부",
      fee: "수강료", tbd: "확정 예정", inquiry: "신청 문의 →",
      options: [
        { tag: "단과", title: "A&R 단과반", lead: "Nino 확정", install: "a-r", price: 550000, listPrice: 660000, desc: "아이돌을 만드는 A&R의 실제 업무. 기획, 캐스팅, 음반 제작 전략을 현업 디렉터에게 직접 배웁니다", included: false },
        { tag: "단과", title: "음향 감독 단과반", lead: "최찬용 확정", install: "sound", price: 550000, listPrice: 660000, desc: "K-POP 라이브 사운드와 백스테이지. 아티스트 모니터(IEM), 토크백, 대형 PA까지 공연 현장이 실제로 어떻게 움직이는지 체험으로 배웁니다", included: false },
        { tag: "올인원", title: "전 과정 패키지", lead: "두 단과 모두 포함", install: "all-in-one --bundle", price: 990000, listPrice: 1320000, desc: "A&R과 음향 감독 두 단과를 모두 포함한 풀 트랙. 실제 공연 프로젝트 참여로 포트폴리오까지 완성합니다", included: true },
      ],
    },
    reassure: {
      refund: "7일 내 100% 환불",
      guard: "최소 인원 미달 시 전액 환불",
      deadlineLabel: "모집 마감",
      today: "오늘 마감",
      ctaMid: "지금 2기 신청하기",
      ctaMidNote: "1분이면 접수 - 결제는 안내 후 진행",
    },
    closed: {
      badge: "CLOSED",
      title: "2기 모집이 마감되었습니다",
      desc: "관심 가져주셔서 감사합니다. 2기는 재모집 예정이며, 모집 일정과 수강 일정은 추후 공지될 예정이에요. 문의는 아래 카카오톡 채널로 남겨주세요.",
      cta: "모집 마감",
      reannounce: "추후 재공지",
    },
    faq: {
      cmd: "cat faq.md", label: "자주 묻는 질문", h1: "궁금한 걸 먼저 풀어드려요",
      items: [
        { q: "외국 국적인데 신청할 수 있나요?", a: "한국에 거주 중인 외국 국적자면 국적과 무관하게 신청할 수 있습니다. 유학(D-2, D-4), 구직(D-10), 취업(E 시리즈), 거주(F 시리즈) 등 한국 체류 자격을 보유하고 있어야 하며, 신청 시 비자 상태를 확인합니다." },
        { q: "한국어가 능숙하지 않아도 괜찮나요?", a: "강의는 100% 한국어로 진행됩니다. 공식 시험 점수는 요구하지 않지만, 한국어로 강의를 이해하고 소통할 수 있는 수준이어야 합니다." },
        { q: "환불 정책은 어떻게 되나요?", a: "결제 후 7일 이내에는 100% 환불됩니다. 수강 시작 후에는 학원법 시행령 별표 4와 공정위 소비자분쟁해결기준에 따라 비례 환불됩니다(전체 1/3 경과 전 2/3, 1/2 경과 전 1/2, 이후 없음). 또한 과정별 최소 10명이 모이지 않으면 그 과정은 취소되고 결제 금액 전액이 자동 환불됩니다." },
        { q: "결제는 어떻게 하나요?", a: "국내 계좌이체(원화)로 진행됩니다. 신용카드와 해외 카드는 지원하지 않습니다. 신청서를 제출하면 선택한 과정과 금액을 확인해 입금 정보를 문자로 안내드리고, 입금까지 완료해야 수강 신청이 최종 확정됩니다." },
        { q: "정원은 몇 명인가요?", a: "과정별 최소 10명 이상 모이면 진행하며, 정원은 과정별 30명입니다. 소수 정원으로 멘토 1인당 밀도 있는 코칭을 하기 위해 자리가 차면 마감됩니다." },
        { q: "수료증은 어디에서 발급되나요?", a: "Dropdown(드롭다운) 명의로 4주 교육 수료증이 발급됩니다. 실제 공연 프로젝트에 참여한 분에게는 유니온 픽처스 명의의 참여 확인서가 별도로 발급되며, 두 문서 모두 이력서에 활용할 수 있는 신뢰 신호입니다." },
        { q: "취업이 보장되나요?", a: "취업 자체는 보장하지 않습니다. 다만 실제 공연에 참여한 포트폴리오, 현업 멘토와의 직접 연결, 이력서에 쓰는 수료증은 확실히 남습니다." },
        { q: "신청하면 다음은 어떻게 되나요?", a: "신청서를 제출하면 입금 정보를 문자로 안내드립니다. 입금이 확인되면 카카오톡 오픈채팅에 입장하고 오리엔테이션 안내를 받습니다. 입금 순서대로 자리가 확정됩니다." },
      ],
    },
    trust: {
      cmd: "verify --issuer", label: "발급 주체",
      h1: "등록된 실체가 발급합니다",
      items: [
        { k: "수료증 발급", v: "Dropdown", note: "사업자등록번호 154-28-02110" },
        { k: "공연 참여 확인서", v: "유니온 픽처스", note: "실제 공연 참여자 대상" },
        { k: "운영 협력", v: "DEEPI", note: "강사 섭외 및 운영 지원" },
      ],
      pressNote: "언론 보도로도 소개된 프로그램입니다",
      certSampleLabel: "이런 수료증이 발급됩니다",
      certSampleNote: "실물 예시 - 개인정보는 가렸습니다",
      processLabel: "신청 후 이렇게 진행됩니다",
      steps: [
        { t: "신청서 제출", d: "최소 정보만, 1분" },
        { t: "입금 정보 문자 안내", d: "선택 과정과 금액 확인 후" },
        { t: "입금 완료", d: "입금 순서대로 자리 확정" },
        { t: "오픈채팅 입장", d: "오리엔테이션 안내" },
      ],
      processGuard: "과정별 최소 10명 미달 시 전액 환불",
    },
    eligibility: {
      cmd: "check --eligibility", label: "지원 자격", h1: "네 가지를 모두 충족하면",
      desc: "K-pop 엔터 업계 진출을 진지하게 노리는 재한 외국인 유학생과 취업 준비생을 위해 설계했습니다. 아래 네 가지를 모두 충족해야 신청할 수 있습니다",
      checking: "> checking requirements...", passed: "> all checks passed. 신청 가능합니다",
      items: [
        { title: "외국 국적의 학생 또는 취업 준비생", body: "한국 거주 중인 외국 국적자를 위한 프로그램입니다. 국적은 무관합니다", chips: ["국적 무관", "한국 거주"] },
        { title: "학생 또는 취업 비자 보유", body: "유학(D-2, D-4), 구직(D-10), 취업(E 시리즈), 거주 또는 직장인(F 시리즈) 등 한국 체류 자격이 있어야 합니다. 신청 시 비자 상태를 확인합니다", chips: ["D-2", "D-4", "D-10", "E 시리즈", "F 시리즈"] },
        { title: "한국어 강의 이해", body: "강의는 100% 한국어로 진행됩니다. 공식 시험 점수는 요구하지 않지만, 한국어로 강의를 이해할 수 있는 수준이어야 합니다", chips: ["한국어 강의", "TOPIK 점수 불필요"] },
        { title: "주말 출석", body: "토요일과 일요일 양일 강의가 기본 구성입니다. 수료자 전원에게 K-pop 공연 현장 실무 체험 기회가 제공됩니다", chips: ["토, 일", "공연 체험 전원"] },
      ],
    },
    schedule: {
      cmd: "cat schedule.json", label: "일정", h1: "언제, 어디서", readonly: "read-only",
      start: "2026년 9월 5일 (토)", startNote: "첫 수업 예정. 모집 마감 8월 30일. 상세 일정은 확정 시 개별 안내",
      place: "서울 강남 또는 마포", placeNote: "결제 후 수업 확정 시 개별 안내",
      enroll: { value: "과정별 최소 10명", note: "단과반은 각각 최소 10명 이상 모집 시 진행됩니다. 두 과정 중 한 과정만 충족해도 그 과정은 열리며, 미달한 과정은 취소하고 전액 환불합니다. 정원은 과정별 30명." },
      refund: {
        title: "환불 정책",
        lines: [
          "결제 후 7일 이내에는 100% 환불됩니다.",
          "수강 시작 후에는 학원법 시행령 별표 4와 공정위 소비자분쟁해결기준에 따라 비례 환불됩니다. 전체 수업의 1/3 경과 전 2/3, 1/2 경과 전 1/2, 1/2 경과 후에는 환불되지 않습니다.",
        ],
      },
    },
    outcomes: {
      cmd: "return outcomes[]", label: "얻는 것", h1: "남는 것만 약속합니다",
      items: [
        { t: "포트폴리오", d: "K-pop 공연에 실제 참여. 사진, 영상, 공연 데이터가 전부 결과물로 남습니다" },
        { t: "업계 네트워킹", d: "현직 멘토와 동기 네트워크. 카카오톡 오픈채팅으로 시즌이 끝나도 이어집니다" },
        { t: "취업 준비", d: "이력서 코칭, 포트폴리오 큐레이션, 면접 시뮬레이션까지 지원합니다" },
        { t: "수료증 + 참여 확인서", d: "Dropdown 명의 수료증, 그리고 공연 참여자에게 유니온 픽처스 참여 확인서" },
      ],
    },
    cohort1: {
      cmd: "git log cohort_01", label: "1기 이야기",
      h1a: "8개국", h1b: "에서 온 1기,", h2: "끝까지 함께 마쳤습니다",
      desc: "2026년 6월부터 7월까지, 8개국에서 온 수강생들이 총 8회 16시간의 전 과정을 마치고 수료했습니다. 그들이 남긴 이야기입니다",
      archive: "1기 아카이브 보기 →",
      stats: [{ n: "8개국", l: "수강생 전원 수료" }, { n: "8회", l: "16시간 전 과정" }, { n: "4주", l: "주말 집중 커리큘럼" }, { n: "실무", l: "공연 프로젝트 참여" }],
      reviewsLabel: "reviews", author: "author", goal: "goal",
      reviews: [
        { initial: "L.", who: "베트남, 27세", goal: "K-pop 작곡 지망", quote: "한국 와서 처음으로 공연이 어떻게 굴러가는지 안에서 봤다. 학교에선 안 가르쳐주는 진짜 흐름." },
        { initial: "M.", who: "인도네시아, 24세", goal: "비주얼 디렉터 지망", quote: "포트폴리오에 실제 무대 영상이 들어간 게 가장 컸다. 면접에서 멘토 이름 한 줄이 통했다." },
        { initial: "K.", who: "중국, 26세", goal: "공연 기획 지망", quote: "공연 기획을 책으로만 봤는데, 실제 팀이 어떻게 움직이는지 옆에서 보니 완전히 달랐다. 현장 감각이 잡혔다." },
        { initial: "S.", who: "태국, 25세", goal: "음향 엔지니어 지망", quote: "혼자 유튜브로만 공부할 땐 막막했다. 한 시즌 옆에서 보고 직접 만지니 내 손에 잡혔다." },
        { initial: "A.", who: "러시아, 28세", goal: "엔터 마케팅 지망", quote: "동기들이랑 카톡방에서 매일 정보 공유한다. 시즌 끝났는데 더 가까워짐." },
        { initial: "P.", who: "필리핀, 23세", goal: "K-pop 안무 지망", quote: "한국어 부족해도 멘토가 영어 섞어서 코칭해줬다. 진짜 포기 안 시켜준다." },
      ],
      reviewNote: "이전에 진행된 동일 커리큘럼 강의 수강생 인터뷰 발췌입니다. 개인정보 보호를 위해 익명 처리했으며, 1기 수강생 실 후기는 동의를 받아 순차 공개됩니다.",
      scenesCmd: "open scenes/", scenesLabel: "1기 현장",
      scenesNote: "2026년 1기 실제 현장입니다. 강의, 실습, 네트워킹의 기록. (수강생 콘텐츠 활용 동의 아래 게재)",
    },
    press: {
      cmd: "cat press/", label: "Press Room", h1: "언론이 주목했습니다",
      items: [
        { title: "외국인 유학생이 엔터테인먼트 산업으로. 드롭다운과 DEEPI, 엔터테인먼트 실무 교육 1기 수료생 배출", desc: "1개월 교육을 마치고 첫 수료생을 배출. K-팝과 공연 등 엔터테인먼트 산업 실무 중심의 글로벌 인재 양성 프로그램" },
        { title: "드롭다운과 DEEPI, 엔터테인먼트 실무 교육 강사 공개 모집. K-팝과 공연 실무 전문가 찾는다", desc: "커리어 플랫폼 드롭다운과 DEEPI가 K-팝과 공연 음향 등 엔터테인먼트 실무 전문가를 대상으로 강사를 공개 모집" },
        { title: "드롭다운, 외국인 유학생 위한 엔터테인먼트 취업 부트캠프 6월 개강", desc: "K-POP 산업의 글로벌 확장에 맞춰 '팬에서 프로로' 실무 중심 부트캠프 등장. 실제 K-POP 공연 프로젝트 참여로 경력을 쌓도록 설계" },
      ],
    },
    apply: {
      cmd: "apply --cohort=2", label: "신청", h1: "무엇을 들을지 고르세요",
      desc: "올인원으로 전부 듣거나, 원하는 단과만 골라 들을 수 있어요. 선택은 언제든 바꿀 수 있습니다",
      selectCmd: "$ select courses",
      allLabel: "올인원", allHint: "전 과정 전부 듣기 (추천)",
      pickLabel: "단과 골라 듣기", pickHint: "원하는 과정만 선택",
      allInOneTag: "ALL-IN-ONE", allInOneHint: "가장 저렴하게 전부",
      prep: "준비중", tbd: "확정 예정", allInOnePrice: 990000,
      nudge: "// 두 단과 다 들으면 올인원이 ₩110,000 이득",
      allCoursesApplied: "두 과정 모두 선택 → 올인원가 적용",
      pickedAll: "선택: 올인원 (전 과정)", pickedN: "선택: 단과 {n}개",
      submit: "신청하기 →",
      guide: "결제는 계좌이체로 진행됩니다. 신청서를 제출하면 선택하신 과정과 금액을 확인해 입금 정보를 문자로 안내드립니다. 입금까지 완료해야 수강신청이 최종 확정됩니다",
      courses: [
        { slug: "a-r", title: "A&R 단과반", meta: "Nino 확정", status: "confirmed", price: 550000 },
        { slug: "sound", title: "음향 감독 단과반", meta: "최찬용 확정", status: "confirmed", price: 550000 },
      ] as CourseOpt[],
    },
    applyForm: {
      cmd: "$ ./apply.sh --submit",
      title: "신청서 작성",
      name: "이름", namePh: "실명",
      email: "이메일", emailPh: "you@example.com",
      phone: "연락처", phonePh: "010-0000-0000",
      nationality: "국적", nationalityPh: "국적 선택",
      birthdate: "생년월일 (선택)",
      visa: "비자", visaPh: "선택",
      address: "거주 지역 (선택)", addressPh: "예: 서울 강남구",
      university: "학교 (선택)", universityPh: "재학/졸업 학교",
      referral: "추천 코드 (선택)", referralPh: "추천인 코드가 있다면 입력하세요",
      consent: "개인정보 수집 및 이용에 동의합니다 (필수)",
      consentOps: "프로그램 운영 안내 수신에 동의합니다 (필수)",
      consentMkt: "마케팅 정보 수신에 동의합니다 (선택)",
      canAttend: "서울에서 진행하는 주말 오프라인 수업에 참여할 수 있습니다 (필수)",
      canAttendNote: "이 과정은 온라인이 없어요. 서울 현장 수업에 올 수 있는 분만 신청해 주세요",
      submit: "신청서 제출",
      submitting: "제출 중...",
      pickRequired: "단과를 1개 이상 선택하세요",
      successTitle: "수강 신청 완료",
      successBadge: "접수 완료",
      success: "신청서가 정상 접수됐어요. 아래 순서대로 진행하면 수강 신청이 최종 확정됩니다",
      successSteps: [
        { n: "01", t: "신청서 접수", d: "선택하신 과정과 정보가 접수됐습니다", done: true },
        { n: "02", t: "입금 정보 문자 안내", d: "선택하신 과정과 금액을 확인해 입금 정보를 문자로 보내드려요", done: false },
        { n: "03", t: "결제 후 최종 확정", d: "입금까지 완료하면 수강 신청이 최종 확정됩니다", done: false },
      ],
      successNote: "문자가 오기까지 잠시 걸릴 수 있어요. 궁금한 점은 카카오톡 채널로 문의해 주세요",
      errorTitle: "제출 실패",
      error: "제출에 실패했습니다. 잠시 후 다시 시도하거나 카카오톡 채널로 문의해 주세요",
      checkTitle: "입력을 확인해주세요",
      checkBody: "아래 항목을 다시 확인해주세요",
    },
    footer: {
      brand: "Growth Career | Fan to Pro",
      l1: "수료증 발급 Dropdown (사업자 154-28-02110). 공연 프로젝트 참여 확인서 유니온 픽처스",
      l2: "강사 섭외 및 운영 협력 DEEPI. 문의는 카카오톡 채널 또는 신청 후 안내 메일",
      draft: "프리뷰. 내부 검토용 draft",
    },
  },

  en: {
    nav: { instructors: "Instructors", program: "Program", courses: "Courses", press: "Press Room", archive: "Cohort 1", apply: "Apply now", stickyLead: "Fan to Pro, starting now" },
    hero: {
      status: "> NOW_CASTING --cohort=02 --track=k_ent",
      line1a: "Fan to ", line1b: "Pro", line1c: ".",
      line2: "A career behind the stage.",
      desc: "Learn directly from an A&R director who has shaped Korea's largest idol audition programs and globally debuted groups. It doesn't end in the classroom. You join a real live production project and walk away with portfolio-worthy experience.",
      location: "In-person classes in Seoul, for international students living in Korea",
      ctaApply: "Apply for Cohort 2", ctaInstructors: "Meet the instructors",
    },
    nodes: { fan: "FAN", lecture: "LEARN", experience: "EXP", expert: "PRO", career: "CAREER" },
    instructors: {
      cmd: "whois instructors", label: "Instructors",
      h1: "Taught by people who do it.", h2: "Proven by their résumé.",
      people: [
        {
          whois: "nino", badge: "A&R course confirmed", role: "A&R Director",
          photo: "/images/instructors/nino-lee.jpg",
          displayName: "Nino", subName: "Lee Se-hwan",
          aff: ["CEO, Sherpa Music", "27 years in music business"],
          credits: [
            { label: "Major label A&R", items: ["Korea's largest idol audition program series", "A&R for many globally debuted idol groups", "Led A&R for Korean and Japanese idol projects"] },
            { label: "CEO, Sherpa Music", items: ["Music planning and artist visual direction", "Award-winning artist projects", "Managed songwriter deals with 290+ teams worldwide"] },
          ],
        },
        {
          whois: "choi", badge: "Sound course confirmed", role: "Sound System Director",
          photo: "/images/instructors/choi-chanyong-live-sound.jpg",
          displayName: "Choi Chan-yong", subName: "최찬용",
          aff: ["Director, E.K Ent.", "Live sound engineer"],
          credits: [
            { label: "Live sound direction", items: ["Lead sound director for pop opera, orchestra, and band shows", "Sound operation for broadcasters, public institutions, and corporate VIP events", "Technical support and artist care on domestic and overseas tour productions"] },
            { label: "Selected shows", items: ["International music festivals", "Orchestra concert series", "Corporate opera concerts, and more"] },
          ],
        },
      ],
      note: "Faculty recruiting and operations partner: DEEPI. The Cohort 2 lineup is revealed as instructors are confirmed.",
    },
    program: {
      cmd: "cat program.md", label: "Program",
      h1: "Not just learning.", h2: "Working, from day one.",
      p1: "Fan to Pro brings the real workflow of the K-entertainment industry into the classroom. You handle the documents, tools, and processes used on the job.",
      p2: "The core is a real project. Graduates take part in an actual Union Pictures live production, build portfolio experience, and receive a participation certificate.",
      p3: "The certificate is issued under Dropdown. One more trusted line on your résumé.",
    },
    curriculum: {
      cmd: "ls curriculum/", label: "Curriculum", h1: "What you learn.",
      desc: "Two single courses, each a 4-week curriculum. All-in-one covers both.",
      weekLabel: "Week",
      courses: [
        {
          slug: "a-r", title: "A&R Course", day: "Sunday 2 to 4 PM", mentor: "Nino",
          weeks: [
            { theme: "Music Business", desc: "The structure of the music industry and business fundamentals." },
            { theme: "Album planning and strategy", desc: "The flow of production strategy from planning to release." },
            { theme: "A&R in practice", desc: "Casting, sourcing songs, and directing artists." },
            { theme: "Visual Directing", desc: "Artist visuals and concept direction." },
          ],
        },
        {
          slug: "sound", title: "Sound Director Course", day: "Saturday 10 AM to 12 PM", mentor: "Choi Chan-yong",
          weeks: [
            { theme: "Inside a K-POP Concert", desc: "Understand the flow of a show day and backstage roles." },
            { theme: "What Does the Artist Hear?", desc: "Wear an IEM and experience the artist's monitor mix firsthand." },
            { theme: "Talkback & Communication", desc: "Real-time communication and problem-solving between artist and engineer." },
            { theme: "Experience a K-POP Show", desc: "Build a mini show together with PA, IEM, and divided roles." },
          ],
        },
      ],
    },
    courses: {
      cmd: "ls courses/", label: "Courses", h1: "Only what you need. Or all of it.",
      fee: "Tuition", tbd: "TBD", inquiry: "Ask to apply →",
      options: [
        { tag: "Single", title: "A&R Course", lead: "Nino confirmed", install: "a-r", price: 550000, listPrice: 660000, desc: "The real work of the A&R who builds idols. Learn planning, casting, and album production strategy directly from a working director.", included: false },
        { tag: "Single", title: "Sound Director Course", lead: "Choi Chan-yong confirmed", install: "sound", price: 550000, listPrice: 660000, desc: "K-POP live sound and backstage. Learn how a show really runs through hands-on experience with artist monitoring (IEM), talkback, and large-format PA.", included: false },
        { tag: "All-in-one", title: "Full Package", lead: "Both courses included", install: "all-in-one --bundle", price: 990000, listPrice: 1320000, desc: "The full track including both the A&R and Sound Director courses. Complete your portfolio through a real live production project.", included: true },
      ],
    },
    reassure: {
      refund: "100% refund within 7 days",
      guard: "Full refund if the minimum isn't met",
      deadlineLabel: "Applications close",
      today: "Closes today",
      ctaMid: "Apply to Cohort 2 now",
      ctaMidNote: "About a minute - payment comes later, after we guide you",
    },
    closed: {
      badge: "CLOSED",
      title: "Cohort 2 applications are closed",
      desc: "Thank you for your interest. Cohort 2 will reopen, and the recruitment and class schedule will be announced soon. For questions, reach us on the KakaoTalk channel below.",
      cta: "Closed",
      reannounce: "To be announced",
    },
    faq: {
      cmd: "cat faq.md", label: "FAQ", h1: "Answers before you ask",
      items: [
        { q: "Can I apply as a foreign national?", a: "Yes, if you live in Korea, regardless of nationality. You need a valid Korean residence status such as study (D-2, D-4), job-seeking (D-10), work (E series), or residence (F series). We check your visa status at application." },
        { q: "What if my Korean isn't fluent?", a: "Classes are taught entirely in Korean. No official test score is required, but you should be able to follow and communicate in Korean during class." },
        { q: "What is the refund policy?", a: "Full 100% refund within 7 days of payment. After classes begin, refunds are prorated per Korean Academy Act and Fair Trade Commission standards (2/3 before 1/3 elapsed, 1/2 before halfway, none after). Also, if a course does not reach its minimum of 10 students, that course is canceled and fully refunded." },
        { q: "How do I pay?", a: "By domestic bank transfer (KRW) only. Credit and overseas cards are not supported. After you submit, we review your selected courses and amount and text you the payment details. Enrollment is confirmed only once payment is complete." },
        { q: "How many seats are there?", a: "Each course runs with at least 10 students and caps at 30. Seats are limited so each mentor can coach closely, and a course closes once it fills." },
        { q: "Who issues the certificate?", a: "A 4-week completion certificate is issued under Dropdown. Those who join an actual live production also receive a participation letter from Union Pictures. Both are credible signals you can put on your resume." },
        { q: "Is a job guaranteed?", a: "We do not guarantee employment itself. What you do keep: a portfolio from a real production, direct connections to working mentors, and a certificate for your resume." },
        { q: "What happens after I apply?", a: "After you submit, we text you the payment details. Once payment is confirmed, you join the KakaoTalk open chat and receive orientation info. Seats are confirmed in order of payment." },
      ],
    },
    trust: {
      cmd: "verify --issuer", label: "Who issues",
      h1: "Issued by registered entities",
      items: [
        { k: "Certificate", v: "Dropdown", note: "Business no. 154-28-02110" },
        { k: "Participation letter", v: "Union Pictures", note: "For actual production participants" },
        { k: "Operations partner", v: "DEEPI", note: "Faculty recruiting and operations" },
      ],
      pressNote: "Covered in the press",
      certSampleLabel: "This is the certificate you receive",
      certSampleNote: "Real example - personal details hidden",
      processLabel: "What happens after you apply",
      steps: [
        { t: "Submit application", d: "Minimal info, about a minute" },
        { t: "Payment details by text", d: "After we confirm courses and amount" },
        { t: "Complete payment", d: "Seats confirmed in order of payment" },
        { t: "Join the open chat", d: "Orientation details follow" },
      ],
      processGuard: "Full refund if a course doesn't reach 10 students",
    },
    eligibility: {
      cmd: "check --eligibility", label: "Eligibility", h1: "Meet all four, and you're in.",
      desc: "Designed for international students and job seekers in Korea who are serious about a career in the K-pop entertainment industry. You must meet all four requirements below to apply.",
      checking: "> checking requirements...", passed: "> all checks passed. You can apply.",
      items: [
        { title: "International student or job seeker", body: "A program for foreign nationals living in Korea. Nationality does not matter.", chips: ["Any nationality", "Living in Korea"] },
        { title: "Student or work visa", body: "You need Korean residency status such as study (D-2, D-4), job-seeking (D-10), work (E series), or residency/employed (F series). Visa status is checked at application.", chips: ["D-2", "D-4", "D-10", "E series", "F series"] },
        { title: "Understand lectures in Korean", body: "Lectures are 100% in Korean. No official test score is required, but you should be able to follow lectures in Korean.", chips: ["Korean lectures", "No TOPIK score needed"] },
        { title: "Weekend attendance", body: "Classes run on both Saturday and Sunday by default. Every graduate gets hands-on experience at a real K-pop live production.", chips: ["Sat, Sun", "Production for all"] },
      ],
    },
    schedule: {
      cmd: "cat schedule.json", label: "Schedule", h1: "When and where.", readonly: "read-only",
      start: "September 5, 2026 (Sat)", startNote: "First class. Applications close August 30. Detailed schedule shared once confirmed",
      place: "Gangnam or Mapo, Seoul", placeNote: "Venue shared individually after payment and class confirmation",
      enroll: { value: "10 per course", note: "Each course runs with at least 10 students. If only one course meets the minimum, that course still runs, and any course that falls short is canceled and fully refunded. Capacity is 30 per course." },
      refund: {
        title: "Refund policy",
        lines: [
          "Full refund within 7 days of payment.",
          "After classes begin, refunds are prorated under the Academy Act Enforcement Decree (Table 4) and the KFTC consumer dispute resolution standards: two thirds before 1/3 of classes elapse, one half before 1/2 elapse, and none after 1/2.",
        ],
      },
    },
    outcomes: {
      cmd: "return outcomes[]", label: "Outcomes", h1: "We only promise what lasts.",
      items: [
        { t: "Portfolio", d: "Take part in a real K-pop production. Photos, video, and show data all become your results." },
        { t: "Industry network", d: "A network of working mentors and peers. It continues over KakaoTalk open chat after the season ends." },
        { t: "Career prep", d: "Résumé coaching, portfolio curation, and interview simulation." },
        { t: "Certificate + participation letter", d: "A Dropdown certificate, plus a Union Pictures participation letter for those who join the production." },
      ],
    },
    cohort1: {
      cmd: "git log cohort_01", label: "Cohort 1",
      h1a: "8 countries", h1b: ", one Cohort 1,", h2: "finished together.",
      desc: "From June to July 2026, students from 8 countries completed the full 8-session, 16-hour program. Here are their stories.",
      archive: "See the Cohort 1 archive →",
      stats: [{ n: "8", l: "countries represented" }, { n: "8", l: "sessions, 16 hours" }, { n: "4", l: "weeks, weekend intensive" }, { n: "Real", l: "live production project" }],
      reviewsLabel: "reviews", author: "author", goal: "goal",
      reviews: [
        { initial: "L.", who: "Vietnam, 27", goal: "K-pop songwriting", quote: "For the first time in Korea, I saw from the inside how a show actually runs. The real flow schools don't teach." },
        { initial: "M.", who: "Indonesia, 24", goal: "Visual director", quote: "Having real stage footage in my portfolio mattered most. One mentor's name in an interview carried weight." },
        { initial: "K.", who: "China, 26", goal: "Show planning", quote: "I'd only read about show planning. Seeing how a real team actually moves, up close, was completely different. I finally got a feel for the field." },
        { initial: "S.", who: "Thailand, 25", goal: "Sound engineer", quote: "Studying alone on YouTube felt hopeless. Watching up close for a season and touching it myself, it finally clicked." },
        { initial: "A.", who: "Russia, 28", goal: "Entertainment marketing", quote: "We share info in the group chat every day. The season is over but we've only gotten closer." },
        { initial: "P.", who: "Philippines, 23", goal: "K-pop choreography", quote: "Even with limited Korean, the mentor coached me mixing in English. They really don't let you give up." },
      ],
      reviewNote: "Excerpts from interviews with students of a prior run of the same curriculum. Anonymized for privacy. Real Cohort 1 reviews will be published with consent.",
      scenesCmd: "open scenes/", scenesLabel: "Cohort 1 on-site",
      scenesNote: "Real scenes from Cohort 1, 2026. A record of classes, hands-on work, and networking. (Published under student content-use consent.)",
    },
    press: {
      cmd: "cat press/", label: "Press Room", h1: "The press took notice.",
      items: [
        { title: "International students into entertainment. Dropdown and DEEPI graduate their first entertainment training cohort", desc: "The first graduates complete a one-month program. A global talent program centered on K-pop and live production." },
        { title: "Dropdown and DEEPI open a public call for entertainment training instructors, seeking K-pop and live production experts", desc: "Career platform Dropdown and DEEPI open a public call for working experts across K-pop and live production." },
        { title: "Dropdown opens an entertainment job bootcamp for international students in June", desc: "A hands-on 'fan to pro' bootcamp arrives amid the global expansion of K-POP. Built so students build a career through real K-POP production projects." },
      ],
    },
    apply: {
      cmd: "apply --cohort=2", label: "Apply", h1: "Choose what you'll take.",
      desc: "Take everything with all-in-one, or pick just the courses you want. You can change your choice anytime.",
      selectCmd: "$ select courses",
      allLabel: "All-in-one", allHint: "Take the full program (recommended)",
      pickLabel: "Pick single courses", pickHint: "Select only what you want",
      allInOneTag: "ALL-IN-ONE", allInOneHint: "Everything, for the best price",
      prep: "Coming soon", tbd: "TBD", allInOnePrice: 990000,
      nudge: "// Take both and all-in-one saves you ₩110,000",
      allCoursesApplied: "Both courses selected → all-in-one price applied",
      pickedAll: "Selected: all-in-one (full program)", pickedN: "Selected: {n} course(s)",
      submit: "Apply →",
      guide: "Payment is by bank transfer. After you submit, we review your selected courses and amount and text you the payment details. Your enrollment is confirmed only once payment is complete",
      courses: [
        { slug: "a-r", title: "A&R Course", meta: "Nino confirmed", status: "confirmed", price: 550000 },
        { slug: "sound", title: "Sound Director Course", meta: "Choi Chan-yong confirmed", status: "confirmed", price: 550000 },
      ] as CourseOpt[],
    },
    applyForm: {
      cmd: "$ ./apply.sh --submit",
      title: "Application",
      name: "Name", namePh: "Full name",
      email: "Email", emailPh: "you@example.com",
      phone: "Phone", phonePh: "010-0000-0000",
      nationality: "Nationality", nationalityPh: "Select a country",
      birthdate: "Date of birth (optional)",
      visa: "Visa", visaPh: "Select",
      address: "Area of residence (optional)", addressPh: "e.g. Gangnam-gu, Seoul",
      university: "School (optional)", universityPh: "Current or past school",
      referral: "Referral code (optional)", referralPh: "Enter a referral code if you have one",
      consent: "I agree to the collection and use of my personal data (required)",
      consentOps: "I agree to receive program operations notices (required)",
      consentMkt: "I agree to receive marketing information (optional)",
      canAttend: "I can attend the in-person weekend classes in Seoul (required)",
      canAttendNote: "There are no online sessions. Please apply only if you can come to the classes in Seoul",
      submit: "Submit application",
      submitting: "Submitting...",
      pickRequired: "Select at least one course.",
      successTitle: "Application complete",
      successBadge: "Received",
      success: "Your application is in. Follow the steps below and your enrollment will be confirmed",
      successSteps: [
        { n: "01", t: "Application received", d: "Your selected courses and details are in", done: true },
        { n: "02", t: "Payment details by text", d: "We review your courses and amount, then text you the payment details", done: false },
        { n: "03", t: "Confirmed after payment", d: "Your enrollment is confirmed once payment is complete", done: false },
      ],
      successNote: "The text may take a little while. Any questions, reach us on the KakaoTalk channel",
      errorTitle: "Submission failed",
      error: "Submission failed. Please try again shortly or reach us via the KakaoTalk channel.",
      checkTitle: "Please check your entries",
      checkBody: "Review the fields below",
    },
    footer: {
      brand: "Growth Career | Fan to Pro",
      l1: "Certificate issued by Dropdown (business no. 154-28-02110). Production participation letter by Union Pictures.",
      l2: "Faculty recruiting and operations partner: DEEPI. Inquiries via KakaoTalk channel or the email sent after applying.",
      draft: "Preview. Internal draft.",
    },
  },
} as const;

export function getContent(locale: string) {
  return locale === "en" ? CONTENT.en : CONTENT.ko;
}
export type Content = ReturnType<typeof getContent>;
