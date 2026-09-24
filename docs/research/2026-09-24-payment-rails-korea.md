# 한국 1인 사업자의 SaaS 결제 레일 조사

- 조사일: 2026-09-24
- 조사자: Echo (Research Lead)
- 대상: 드롭다운 (개인사업자/법인, 사업자번호 154-28-02110) 기준 1인 SaaS 구독 결제 수단 선택
- 신뢰도 표기: HIGH (공식 문서/1차 자료) / MED (업계 2차 자료 교차 확인) / LOW (단일 출처 또는 추정)

> 주의: 수수료율과 규제는 자주 바뀐다. 본 문서의 모든 수치는 2026-09-24 기준 공개 페이지 값이며, 계약 직전 반드시 공식 페이지 재확인 필요.

---

## 1. 한국 사업자가 붙일 수 있는 SaaS 구독 결제 선택지

### 1.1 토스페이먼츠

| 항목 | 내용 | 신뢰도 |
|---|---|---|
| 가입비 | 220,000원 (최초 1회) | HIGH |
| 연관리비 | 110,000원 (연 1회) | HIGH |
| 신용/체크카드 | 3.4% | HIGH |
| 간편결제 | 3.4% (일부 간편결제 추가 수수료) | HIGH |
| 계좌이체 | 2.0% (최저 건당 200원) | HIGH |
| 가상계좌 | 건당 400원 | HIGH |
| 브랜드페이 | 신용/체크카드 4.3% | HIGH |
| PayPal (해외 간편결제) | 4.0% + 건당 0.3 USD + 환전 2.5% | HIGH |
| 부가세 | 전 항목 VAT 10% 별도 | HIGH |

출처: <https://www.tosspayments.com/about/fee> (2026-09-24 확인)

**정기결제 (자동결제/빌링)**
- 빌링키 발급 후 주기마다 임의 금액 결제하는 구조. 공식 문서에 명시.
- **"리스크 검토 및 추가 계약 후 사용 가능"** 이며 **"정기 구독형 서비스가 아니면 정책적으로 자동결제 사용이 제한"** 됨. 즉 SaaS 구독은 정당한 용도라 통과 가능성이 높은 편.
- 신뢰도: HIGH. 출처: <https://docs.tosspayments.com/guides/billing/overview>

**개인사업자 가입**
- 가능. 토스페이먼츠는 비사업자를 위해 사업자등록 바로신청 서비스까지 제공. 개인사업자용 이용계약서가 별도 존재.
- 신뢰도: HIGH. 출처: <https://www.codemshop.com/wp-content/uploads/pgall/tosspayment_individual.pdf>
- 가입비/연관리비는 계약형태에 따라 달라질 수 있다고 공식 명시. 협상 여지 있음.

### 1.2 나머지 국내 PG 비교

| PG | 정기결제 | 개인사업자 | 특징 | 신뢰도 |
|---|---|---|---|---|
| 페이플 (Payple) | 국내 카드 빌링키 + 계좌 ARS 자동이체 + 해외카드 정기결제. 네이버페이/카카오페이 빌링결제 오픈 | 사업자등록 필수 | 정기결제 특화. 멤버십 월 55,000원으로 D+1 정산. 연동 없이 링크 결제 가능 | MED |
| 포트원 (구 아임포트) | PG 어그리게이터. 정기결제는 계약한 PG 가 수행 | PG 별로 상이 | **포트원은 정산 주체가 아님.** 정산 주기/수수료는 뒤에 붙는 PG 가 결정. 여러 PG 를 한 SDK 로 묶는 용도 | HIGH |
| 나이스페이먼츠 | 지원 | 가능 (포스타트 상품) | 보증보험 필수 가입, 업종별 금액 상이 | MED |
| KG이니시스 | 지원 | 가능 | 해외카드 사용 시 보증보험 필수 + 거래 한도 제한 | MED |
| NHN KCP | 지원 | 가능 | **비실물 디지털 콘텐츠/구독 업종 입점이 막히는 것으로 보고됨** | MED |

출처:
- 포트원 정기결제 FAQ: <https://blog.portone.io/billing_payment/>
- 포트원 해외결제 PG 8곳 비교: <https://blog.portone.io/opi_pg-comparison_global/>
- 페이플: <https://www.payple.kr/>
- 나이스페이 포스타트: <https://start.nicepay.co.kr/homepage/price.do>
- 이니시스 해외카드 보증보험: <https://imweb.me/faq?mode=view&category=56&category2=105&idx=72170>

### 1.3 정기결제 심사 난이도 (공통 패턴)

- **정기결제는 구매자 인증이 생략되는 결제** 라서 PG 입점 심사가 일반 결제보다 까다롭다. 이건 업계 공통 패턴이지 특정 PG 의 문제가 아님.
- 신뢰도: HIGH. 출처: <https://blog.portone.io/billing_payment/>
- 토스페이먼츠 빌링 심사 소요는 보통 1~3 영업일로 보고됨 (신뢰도 LOW, 2차 자료).
- **비실물 디지털 콘텐츠/구독 업종** 은 PG 마다 정책이 갈린다. 카드사 등록 불가 업종은 전 PG 공통 차단이고, 그 위에 각 PG 가 자체 정책으로 더 좁게 제한.
- 신뢰도: MED. 출처: <https://help.portone.io/content/high-risk-industry>

**결론**: 1인 SaaS 구독 = 정당한 정기 구독형 서비스이므로 토스페이먼츠 빌링 심사 통과 가능성 높음. 다만 실물 없는 디지털 서비스라 사업 설명 자료 (서비스 소개, 환불 정책, 이용약관) 를 잘 준비해야 한다.

---

## 2. 국내 PG 로 해외 카드를 받을 수 있는가

### 2.1 결론부터: 받을 수 있다. 법이 막는 게 아니다.

노아의 의문 ("토스페이먼츠는 왜 해외 결제를 못 받게 하는가, 법이 문제인가") 에 대한 답:

**토스페이먼츠는 해외카드 결제를 지원한다.** 다만 기본 계약에 포함되지 않고 **별도 특약 + 카드사 추가 심사** 가 필요하다. "못 받게 하는" 게 아니라 "추가 심사를 요구하는" 것.

| 항목 | 내용 | 신뢰도 |
|---|---|---|
| 지원 카드 | Visa, Mastercard, JCB, American Express, Diners Club, Discover, UnionPay | HIGH |
| 계약 절차 | 계약 요청 후 영업일 2일 내 계약 등록, **등록일로부터 영업일 10~14일간 해외 카드 사용을 위한 추가 카드사 심사** | HIGH |
| 기본 통화 | 원화 (KRW). USD/JPY 등 다통화는 **별도 계약 필요** | HIGH |
| MID 제약 | **"하나의 MID 는 하나의 통화만 가질 수 있어요"** - 원화와 외화 동시 지원하려면 MID 를 따로 발급 | HIGH |
| PayPal | 계약 등록 영업일 2~3일. **USD 만 지원.** 호스팅사 사용 불가 | HIGH |
| 보안 | 3D Secure (3DS) 로 발급사 인증 | HIGH |
| 다국어 결제창 | 한국어/영어/중국어/일본어 지원 | HIGH |

출처:
- <https://docs.tosspayments.com/guides/v2/learn/foreign-payment>
- <https://docs.tosspayments.com/resources/glossary/international-payment>
- <https://docs.tosspayments.com/guides/v2/payment-window/integration-international>

### 2.2 실제 제약은 무엇인가

**[HIGH] 구조적 제약: 해외카드 전용 MID 를 추가로 발급받아야 한다.**
국내 PG 5곳 (이지페이/KICC, NHN KCP, 토스페이먼츠, KG이니시스, 나이스정보통신) 전부 동일한 구조다. 기존 국내 PG 가맹점이 **해외카드 사용 특약** 을 신청하고, 카드사와 매입사 심사를 거쳐 해외카드 결제용 MID 를 추가 발급받는다.
출처: <https://blog.portone.io/opi_pg-comparison_global/>

**[HIGH] 정산 통화 제약**

| PG | 정산 통화 | 정산 주기 |
|---|---|---|
| 토스페이먼츠 | KRW 만 | 미공개 |
| KG이니시스 | KRW | 미공개 |
| 나이스정보통신 | KRW (USD 별도 협의) | 미공개 |
| 이지페이 (KICC) | KRW, USD | D+4 영업일 |
| NHN KCP | KRW, USD | 미공개 |
| 엑심베이 | KRW, USD | 미공개 |
| 페이레터 | KRW, USD | 매주 목요일 |
| 페이먼트월 | USD, EUR, KRW (거래 1억원 이상) | 미공개 |

출처: <https://blog.portone.io/opi_pg-comparison_global/>

**[MED] 리스크 담보 요구**
- KG이니시스: 해외카드 결제수단 사용 시 **보증보험 가입 필수 + 거래 한도 제한** 가능.
- 나이스페이: 보증보험 필수 가입, 업종별 가입 금액 상이.
- 이유: 해외카드는 차지백 (Chargeback, 지불거절) 리스크가 국내카드보다 현저히 높다. 국내 카드 분쟁은 국내 카드사 규정으로 해결되지만 해외카드 차지백은 국제 카드 브랜드 규정을 따르고 가맹점 방어가 어렵다.
출처: <https://blog.portone.io/crossborder-insight-2/>, <https://imweb.me/faq?mode=view&category=56&category2=105&idx=72170>

**[LOW] 외국환거래법 / 전자금융거래법 관련**
- 조사 범위 안에서 **"국내 PG 가 해외카드를 받는 것을 금지하는 법 조항" 은 발견하지 못했다.** 실제로 토스페이먼츠 공식 문서가 해외카드 결제를 안내하고 있으므로 법적 금지가 아니라는 것은 반증된다.
- 전자금융거래법 관련해서는 **미등록 PG 규제** 가 최근 강화됐다. 결제대금 정산에 관여하는 사업자는 전자지급결제대행업 등록 대상이며, 전자금융업자는 미등록 PG 와 계약할 수 없다. 이건 PG 를 쓰는 입장인 노아에게는 오히려 안전장치 (등록 PG 만 쓰면 됨) 이지 제약이 아니다.
- 출처: 금융위 보도설명 <https://fsc.go.kr/no010102/82523>
- **모르는 것**: 용역 수출 (SaaS 해외 판매) 에 대한 외국환거래법상 신고 의무 유무, 영세율 적용 요건, 부가세 처리는 **조사하지 않았다. 세무사 확인 필요.** 이 부분은 추측하지 않겠다.

### 2.3 실제로 국내 SaaS 들은 해외 고객을 어떻게 받는가

**[MED] 4가지 경로가 관찰된다.**

1. **MoR 사용** (Paddle, Lemon Squeezy, Polar 등). 가장 흔한 경로. 세금/VAT 처리를 대행받는 게 핵심 이유.
2. **해외 법인 설립 후 Stripe** (싱가포르, 미국 Delaware LLC 등). 규모가 커지고 나면 선택.
3. **국내 PG 해외카드 특약** (토스페이먼츠 + PayPal 또는 해외카드 MID). 원화 정산 감수.
4. **해외 특화 PG** (엑심베이, 페이레터, 페이먼트월). USD 정산 가능.

출처: <https://www.mashupventures.co/contents/global-payment-solutions-for-saas-startups>, <https://blog.portone.io/opi_pg-comparison_global/>

---

## 3. Stripe 의 한국 사업자 지원 현황 (2026-09-24 기준)

### [HIGH] 한국은 Stripe 계정 개설 가능 국가가 아니다.

Stripe 공식 global availability 페이지 (<https://stripe.com/global>) 의 지원 국가 목록 (50개 이상) 에 **South Korea 는 포함되어 있지 않다.**

- 목록에 있는 아시아태평양: Australia, Hong Kong, Japan, Malaysia, New Zealand, Singapore, Thailand, UAE
- Preview (영업 문의 필요) 단계: India, Indonesia
- Extended network (Paystack 경유): Côte d'Ivoire, Ghana, Kenya, Nigeria, South Africa
- **Korea 는 어느 단계에도 없다.**

### [HIGH] 혼동 주의: "Stripe 가 한국 결제 지원" 은 다른 이야기다.

2024-10-28 Stripe 체인지로그에 한국 결제수단 지원이 추가됐다 (<https://docs.stripe.com/changelog/acacia/2024-10-28/south-korean-payment-methods>). 하지만 이건:

- **가능**: 이미 해외에 Stripe 계정을 가진 사업자가 **한국 고객으로부터** 원화 (KRW) 로 카드/네이버페이/카카오페이 결제를 받는 것
- **불가능**: 한국 법인이나 한국 개인사업자가 **자기 명의로** Stripe 계정을 개설하는 것

이 둘을 섞어서 "Stripe 한국 열렸다" 고 말하는 글이 많다. 노아가 마주칠 가장 흔한 오정보다.
출처: <https://stripe.com/payment-method/korea>, 커뮤니티 정정 <https://www.threads.com/@dalgom.bami/post/DPRAWfBEnZT/>

### [HIGH] Stripe Managed Payments (Stripe 의 자체 MoR 상품) 도 한국 제외

2025년 4월 출시된 Stripe Managed Payments 는 Stripe 가 직접 Merchant of Record 가 되는 상품이다. 2026년 중반 기준 약 35개국 (미국, 캐나다, 서유럽 대부분, 호주, 홍콩, 일본, 싱가포르) 에서만 이용 가능하며 **한국, 중국, 인도, 터키, 브라질은 대상이 아니다.** 주로 미국 기반 사업자 중심으로 점진 롤아웃 중.
- 공식 문서: <https://docs.stripe.com/payments/managed-payments>, <https://stripe.com/managed-payments>
- 국가 제외 근거 (2차 자료, MED): <https://dodopayments.com/blogs/stripe-supported-countries-alternatives>

### [HIGH] 단, Stripe Connect Express 의 payout 커버리지는 훨씬 넓다.

Stripe 단독 계정 (Payments) 은 한국 불가지만, **플랫폼이 Stripe Connect Express 로 한국 거주자에게 송금 (payout) 하는 것은 가능하다.** GitHub Sponsors 와 Polar 가 이 구조로 한국 창작자/판매자에게 돈을 보낸다. 이게 3번과 4번 질문을 잇는 핵심이다.
출처: <https://polar.sh/docs/merchant-of-record/supported-countries>, <https://stripe.com/newsroom/stories/githubsponsors>

---

## 4. GitHub Sponsors 의 Stripe 연결 계정 vs 일반 Stripe 계정

### [HIGH] 완전히 별개다.

- GitHub Sponsors 는 **Stripe Connect Express 계정** 을 쓴다. 노아가 Sponsors 를 켜면서 만든 건 GitHub 이라는 플랫폼 아래에 붙은 **connected account** 지, 독립적인 Stripe merchant account 가 아니다.
- Express 계정은 **결제 수납 (charge) 용이 아니라 정산 수령 (payout) 용** 이다. 그래서 한국처럼 Stripe Payments 미지원 국가에서도 만들어진다.
- 이 계정으로 노아의 SaaS 결제를 받을 수 없다. API 키도 없고, 대시보드도 Express 전용 축약판이다.
- 기존 Stripe 계정을 GitHub Sponsors 에 연결하는 방법은 **없다** (GitHub 공식 답변).

출처:
- <https://github.com/orgs/community/discussions/23267>
- <https://github.com/orgs/community/discussions/77844>
- <https://github.com/orgs/community/discussions/153919>
- <https://stripe.com/newsroom/stories/githubsponsors>

### [MED] 실무 주의: 이메일 충돌

같은 이메일로 Sponsors Express 계정과 별도 Stripe 계정을 동시에 유지하려 하면 꼬인다. 커뮤니티 권장 방식은 **서로 다른 이메일 사용**. Express 계정을 개인 이메일로 넘기고, 업무용 이메일로 별도 계정을 만드는 식. 단 위에서 봤듯 한국 주소로는 일반 Stripe 계정 자체가 안 만들어진다.
출처: <https://github.com/orgs/community/discussions/23267>

### 노아가 자기 상태를 확인하는 방법

1. GitHub 에서 확인: `github.com/settings/sponsors` 또는 `github.com/sponsors/<본인계정>/dashboard` 의 payout 설정. 여기 연결된 Stripe 는 Express connected account.
2. Stripe 쪽 확인: Sponsors 대시보드에서 "View Stripe dashboard" 로 들어가면 Express 대시보드 (거래 내역 + payout 만 보이고 API keys / Developers 메뉴 없음) 가 뜬다. **Developers / API keys 메뉴가 없으면 Express 계정** 이다.
3. `dashboard.stripe.com` 에 직접 로그인해서 계정 목록을 본다. Express 계정은 여기 일반 계정처럼 나타나지 않는다.
- 신뢰도: MED (공식 문서로 각 화면을 직접 확인하지는 않았음. 실제 로그인해서 검증 권장)

---

## 5. Merchant of Record (MoR) 서비스 비교

MoR 은 그들이 법적 판매자가 되고 노아는 그들에게 소프트웨어를 공급하는 구조다. 전 세계 VAT/판매세 신고와 납부, 차지백, 결제 관련 CS 를 그들이 진다. 대신 수수료가 일반 PG 보다 높다.

| 항목 | Paddle | Lemon Squeezy | Polar |
|---|---|---|---|
| 수수료 (Checkout) | SRP 의 5% + 0.5 USD | 5% + 0.5 USD (표준) | 4% + 0.4 USD (공개값, 확인 필요) |
| 인보이스/계좌이체 | SRP 의 3.5% | - | - |
| 한국 판매자 가능 | **명시적 확인 실패 (LOW)**. 제재국 (러시아, 벨라루스, 이란, 북한) 만 배제된다고 안내. 한국이 제외 목록에 없다는 정황은 있으나 공식 화이트리스트 미확인 | **가능 (HIGH)**. 은행 정산 지원 국가 목록에 "Republic of Korea (ROK)" 명시 | **가능 (HIGH)**. payout 지원 국가 목록에 South Korea 명시 |
| 세금 처리 범위 | 전 세계 판매세/VAT 징수, 신고, 납부 대행 | 동일 | 동일 (Polar 가 미국 법인으로 MoR) |
| 정산 방식 | 은행 송금 | 은행 송금 또는 PayPal | Stripe Connect Express |
| 정산 주기 | 미확인 (LOW) | 미확인 (LOW) | 미확인 (LOW) |
| 리스크 | - | **Stripe 가 2024-07 인수. 후속 상품은 Stripe Managed Payments 이고 Lemon Squeezy 팀이 그걸 만들고 있음. 종료일 발표는 없지만 방향은 명확** | 상대적으로 신생. 서비스 지속성 리스크 |

출처:
- Paddle MSA (수수료 조항): <https://www.paddle.com/legal/terms>
- Paddle 지원 국가: <https://developer.paddle.com/concepts/sell/supported-countries-locales/>, <https://www.paddle.com/help/start/intro-to-paddle/which-countries-are-supported-by-paddle>
- Lemon Squeezy 지원 국가: <https://docs.lemonsqueezy.com/help/getting-started/supported-countries>
- Lemon Squeezy 인수/방향: <https://www.lemonsqueezy.com/blog/stripe-acquires-lemon-squeezy>, <https://www.lemonsqueezy.com/blog/2026-update>
- Polar 지원 국가: <https://polar.sh/docs/merchant-of-record/supported-countries>

### [HIGH] MoR 의 핵심 메커니즘 (한국 사업자에게 중요한 이유)

Polar 문서가 이 구조를 가장 명확히 설명한다. **모든 고객 결제는 Polar (미국 법인) 에게 간다.** 그 다음 Polar 가 Stripe Connect Express 로 판매자에게 송금한다. Connect Express 의 국가 커버리지가 Stripe Payments 단독보다 훨씬 넓기 때문에 한국 판매자도 돈을 받을 수 있다.

즉 **한국 사업자가 Stripe 계정을 못 만드는 문제를 MoR 이 우회한다.** 이게 한국 1인 SaaS 가 MoR 을 쓰는 가장 현실적인 이유다.

### 미확인 항목 (모르는 것)

- 각 MoR 의 정확한 정산 주기 (Paddle/Lemon Squeezy/Polar). 계약 전 직접 확인 필요.
- Paddle 의 한국 판매자 가입 가능 여부. 공식 화이트리스트를 찾지 못했다. **Paddle 에 직접 문의해서 확인해야 한다.**
- MoR 로 받은 수익의 한국 세무 처리 (용역 수출 영세율 적용 여부, 원천징수, 증빙). 세무사 확인 필수.
- Polar 의 4% + 0.4 USD 수수료는 공개 pricing 페이지 값으로 알려져 있으나 이번 조사에서 pricing 페이지 원문을 직접 확인하지 못했다. LOW.

---

## 6. 에이전트 결제 프로토콜 현황

노아의 질문: "AGI 시대에 결제가 더 간편해져야 하지 않나, 그런 솔루션은 없나."

### 판정: **지금 1인 SaaS 프로덕션에 쓸 수 있는 것은 없다.**

### 6.1 ACP (Agentic Commerce Protocol) - OpenAI + Stripe + Meta

| 항목 | 내용 | 신뢰도 |
|---|---|---|
| 발표 | 2025-09-29, OpenAI 와 Stripe 공동 개발 | HIGH |
| 라이선스 | Apache 2.0 오픈소스 | HIGH |
| 스펙 상태 | 날짜 기반 버저닝. 최신 스냅샷 2026-04-17 (cart, feed, orders, authentication, MCP 호환 추가) | MED |
| 구성 | Agentic checkout, Cart and feed, Delegate payment, Delegate authentication, Orders and webhooks | HIGH |
| 참여 방법 | **"If your business wants to participate in ChatGPT, you'll need to apply"** - 신청 및 승인 필요 | HIGH |
| 지리 제약 | 초기 Instant Checkout 은 **미국 기반 스토어 + Shopify Payments** 요구 | MED |

**[HIGH] 결정적 사실: OpenAI 가 2026-03-24 ChatGPT 내 Instant Checkout 을 접었다.**

CNBC 보도 (2026-03-24) 기준 OpenAI 는 ChatGPT 쇼핑 경험을 개편하면서 in-chat 결제를 중단하고, 사용자가 ChatGPT 에서 상품을 탐색한 뒤 **판매자 사이트나 파트너 앱 (Instacart, Target, Expedia 등) 으로 이동해 결제** 하는 모델로 전환했다.

전환 이유로 보고된 것:
- 2026년 2월 기준 Instant Checkout 참여 Shopify 가맹점이 약 30곳에 그침
- Walmart 는 약 20만 개 상품을 올렸으나 온보딩이 번거롭고 재고/배송비 정보가 자주 부정확
- 사용자가 ChatGPT 에서 상품을 조사하는 데는 적극적이지만 **결제는 거기서 완료하지 않았다**

출처: <https://www.cnbc.com/2026/03/24/openai-revamps-shopping-experience-in-chatgpt-after-instant-checkout.html> (HIGH), <https://stripe.com/newsroom/news/stripe-openai-instant-checkout> (HIGH, 최초 발표), <https://agenticcommerce.dev> (HIGH, 스펙), <https://docs.stripe.com/agentic-commerce/acp> (HIGH)

> 프로토콜 자체 (ACP) 는 살아있고 계속 발전 중이다. 하지만 **가장 큰 유통 채널이었던 ChatGPT in-chat 결제가 6개월 만에 접혔다** 는 건, 이 영역이 아직 실험 단계라는 가장 강한 증거다.

### 6.2 AP2 (Agent Payments Protocol) - Google

| 항목 | 내용 | 신뢰도 |
|---|---|---|
| 발표 | 2025-09, Google 주도 | HIGH |
| 파트너 | Mastercard, PayPal 포함 60개 이상 조직 | MED |
| 구조 | Mandate (권한 위임 증서) 기반 암호학적 결제 승인. 전통 결제 레일 + 스테이블코인 양쪽 지원 | MED |
| 상태 | 사양 공개 및 레퍼런스 구현 존재. **1인 SaaS 가 구독 결제를 붙일 수 있는 상용 제품 형태는 아님** | MED |

출처: <https://cloud.google.com/blog/products/ai-machine-learning/announcing-agents-to-payments-ap2-protocol>

### 6.3 x402 - Coinbase

| 항목 | 내용 | 신뢰도 |
|---|---|---|
| 정체 | HTTP 402 Payment Required 상태코드를 되살린 온체인 결제 프로토콜. AP2 의 스테이블코인 확장으로도 동작 | MED |
| 네트워크 | Base, Solana 등에서 라이브 | MED |
| 통화 | USDC 등 스테이블코인 | MED |
| 실사용 | 에이전트 간 마이크로페이먼트, API 종량 과금이 주 용도 | MED |

출처: <https://www.coinbase.com/developer-platform/discover/launches/google_x402>, <https://metamask.io/news/what-is-x402>

**한국 사업자 적용 시 문제**: 암호화폐 수취는 한국 세무/회계 처리가 복잡하고, 특정금융정보법 관련 이슈가 있을 수 있다. **이 부분은 조사하지 않았고 추측하지 않겠다.** 일반 소비자 대상 SaaS 구독에는 부적합하다.

### 6.4 종합 판정

| 프로토콜 | 프로덕션 사용 가능? | 이유 |
|---|---|---|
| ACP | **아니오** | 스펙은 성숙 중이나 가장 큰 채널이 in-chat 결제를 중단. 참여에 신청/승인 필요. 미국 중심 |
| AP2 | **아니오** | 사양 단계. 한국 1인 사업자가 붙일 상용 제품 없음 |
| x402 | **조건부** | 기술적으로 동작하지만 에이전트 대 에이전트 마이크로페이먼트용. 사람 대상 SaaS 구독에 부적합. 한국 세무 리스크 미확인 |

**노아에게**: "AGI 시대니까 결제가 간편해졌을 것" 은 아직 사실이 아니다. 2025년 9월에 크게 발표된 것이 2026년 3월에 접혔다. 이건 우리만의 문제가 아니라 **업계 패턴** 이다. 사람이 신뢰를 갖고 돈을 쓰는 순간에는 여전히 판매자 사이트에서의 명시적 결제가 필요하다는 게 지금까지의 데이터다.

지금 할 일은 **평범한 구독 결제를 붙이는 것** 이고, ACP 는 6~12개월 뒤 다시 확인할 백로그 항목이다.

---

## Open Questions (확인 필요)

1. **Paddle 이 한국 판매자를 받는가.** 공식 화이트리스트를 못 찾았다. Paddle 지원팀에 직접 문의 필요. (Lemon Squeezy 와 Polar 는 한국 명시 확인됨)
2. **MoR 수익의 한국 세무 처리.** 용역 수출 영세율, 부가세 신고, 증빙 서류. 세무사 확인 필수. 추측 금지 영역.
3. **각 MoR 의 정산 주기와 최소 정산 금액.** 1인 사업자 현금흐름에 직접 영향.
4. **토스페이먼츠 가입비 면제 조건.** "계약형태에 따라 상이" 라고만 공식 안내. 영업 문의로 확인 가능.
5. **Polar 의 정확한 현재 수수료.** pricing 페이지 원문 미확인.
6. **드롭다운의 현재 사업자 형태 (개인사업자 vs 법인)** 에 따라 PG 심사 서류가 달라진다. 확인 후 진행.

---

## Recommendation

**국내 고객만 대상이면 토스페이먼츠 빌링 하나로 시작. 해외 고객이 섞이면 Polar 또는 Lemon Squeezy 를 MoR 로 병행.**

이유 3줄:
1. 한국 사업자는 Stripe 계정을 못 만든다 (공식 지원 국가 목록에 없음, HIGH). 해외 수납의 현실적 유일 경로는 MoR 이고, Polar 와 Lemon Squeezy 는 한국 판매자 정산을 **문서로 명시** 하고 있다 (Paddle 은 미확인).
2. 국내 고객 대상이면 토스페이먼츠가 수수료 3.4% 로 MoR 의 5% + 0.5 USD 보다 싸고, 정기결제 심사도 정당한 구독 서비스라면 통과 가능성이 높다. 가입비 220,000원 + 연 110,000원은 매출이 생긴 뒤 감당할 비용이지 시작 비용이 아니다.
3. Lemon Squeezy 는 Stripe 인수 후 후속 상품 (Stripe Managed Payments, 한국 미지원) 으로 흡수되는 방향이라 **5년 볼 거면 Polar 가 낫고, 지금 당장 쓸 거면 Lemon Squeezy 가 안정적** 이다. 둘 다 MoR 이라 나중에 갈아타는 비용이 PG 직결보다 낮다.

---

## 검증용 랜딩 + 대기자 폼 단계에 결제가 필요한가

**결론: 결제 연동은 필요 없다. 하지만 "대기자 이메일 수집" 만으로는 검증이 아니다.**

### 왜 결제 연동이 필요 없나

1. **PG 심사가 선행 조건이다.** 토스페이먼츠 빌링은 별도 계약과 리스크 심사를 요구하고, 심사 시 서비스 설명과 환불 정책을 본다. **서비스가 없는 상태에서 심사를 넣으면 통과가 어렵고, 통과해도 그 사이 제품 방향이 바뀌면 재심사다.** 순서가 거꾸로다.
2. 해외카드는 여기에 영업일 10~14일 카드사 심사가 더 붙는다. 검증 단계에 이 리드타임을 쓸 이유가 없다.
3. MoR 은 가입은 빠르지만 **판매 실적 없는 계정에 대해 KYC 와 사업 검토를 한다.** 역시 제품이 있어야 매끄럽다.

### 그런데 "대기자 이메일" 은 약한 신호다

이메일 입력은 비용이 0원이라 "관심 있다" 이상을 증명하지 못한다. 대기자 1,000명 모으고 출시했더니 전환 2%, 라는 패턴이 이 바닥의 고전이다.

**결제 연동 없이 지불 의사를 검증하는 방법이 있다.** 강도 순:

| 방법 | 지불 의사 신호 | 결제 연동 필요? |
|---|---|---|
| 이메일만 수집 | 매우 약함 | 불필요 |
| 가격을 랜딩에 명시하고 그 다음에 이메일 수집 | 약함~중간. 가격 보고도 남는지가 필터 | 불필요 |
| 플랜 선택 후 이메일 (어느 플랜 눌렀는지 기록) | 중간 | 불필요 |
| **사전 예약금 또는 얼리버드 선결제** | 강함 | **필요** |
| 1대1 대화에서 "지금 계좌이체 해주시면 평생 50% 할인" | 가장 강함 | 불필요 (계좌이체) |

### Echo 의 권고

**Phase 1 (지금)**: 결제 연동 0. 대신 **랜딩에 실제 가격을 박고**, 대기자 폼에서 **플랜 선택을 강제** 한다. 어느 가격대에서 이탈하는지가 데이터다. 이건 Growth Career 에서 이미 쓰고 있는 analytics 이벤트 (`view_` / `scroll_` / `click_object_in_` / `start_apply` / `completed_apply`) 패턴을 그대로 재사용하면 된다.

**Phase 2 (초기 고객 10명 이하)**: 결제 연동 대신 **계좌이체 + 수동 인보이스**. 드롭다운은 이미 토스뱅크 계좌로 수강료를 받고 있으므로 인프라가 이미 있다. 10명까지는 수동이 PG 심사보다 빠르다. 여기서 실제로 돈을 내는 사람이 나오면 그게 진짜 검증이다.

**Phase 3 (수동 정산이 아플 때)**: 그때 토스페이먼츠 빌링 심사를 넣는다. 이 시점에는 서비스 실체와 매출 근거가 있어서 심사가 쉽다.

**"검증 단계에 결제가 필요한가" 의 정직한 답**: 결제 **연동** 은 필요 없지만 **돈** 은 필요하다. 계좌이체로 받으면 된다. PG 를 붙이는 건 결제를 받기 위해서가 아니라 **결제를 자동화** 하기 위해서다. 자동화할 만큼의 볼륨이 없으면 아직 PG 를 붙일 때가 아니다.
