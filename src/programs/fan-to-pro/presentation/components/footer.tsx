import { Container } from "../ui/container";

const COMPANY = {
  nameKr: "드롭다운",
  nameEn: "Dropdown",
  ceo: "황재하",
  bizNo: "154-28-02110",
  ecommerceNo: "제2026-서울송파-0882호",
  address: "서울특별시 송파구 중대로 207, 2층 201-J554호 (가락동, 대명빌딩)",
  email: "hello@dropdown.xyz",
} as const;

const POLICY_LINKS = [
  { label: "환불 정책", href: "/terms#refund-policy" },
  { label: "결제 안내", href: "/terms#payment" },
  { label: "개인정보 처리방침", href: "/privacy" },
  { label: "이용약관", href: "/terms" },
];

const NAV_LINKS = [
  { label: "프로그램", href: "#program" },
  { label: "멘토", href: "#mentor" },
  { label: "후기", href: "#testimonials" },
  { label: "FAQ", href: "#faq" },
  { label: "신청", href: "#apply" },
];

export function Footer() {
  return (
    <footer className="border-border border-t bg-bg px-6 py-16 text-fg-muted sm:px-10">
      <Container>
        <div className="grid grid-cols-1 gap-12 md:grid-cols-[1.5fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <p
              className="mb-3 font-black text-fg text-2xl"
              style={{ letterSpacing: "-0.04em" }}
            >
              GROWTH
              <span className="text-brand-pink">·</span>
              CAREER
            </p>
            <p
              className="mb-3 text-fg-muted text-xs uppercase"
              style={{ letterSpacing: "0.25em" }}
            >
              Fan to Pro · K-Entertainment Track
            </p>
            <p className="mb-6 max-w-md text-sm leading-relaxed">
              한국 엔터테인먼트 업계 진입을 위한 외국인 유학생 전용 부트캠프.
              실제 K-pop 공연 프로젝트로 경력을 만든다.
            </p>
            <p
              className="text-fg-subtle text-xs uppercase"
              style={{ letterSpacing: "0.2em" }}
            >
              Powered by {COMPANY.nameEn}
            </p>
          </div>

          {/* Nav */}
          <div>
            <p
              className="mb-4 text-fg-subtle text-xs font-black uppercase"
              style={{ letterSpacing: "0.3em" }}
            >
              Navigate
            </p>
            <ul className="grid grid-cols-1 gap-2 text-sm">
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    className="transition-colors hover:text-brand-pink"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Policies */}
          <div>
            <p
              className="mb-4 text-fg-subtle text-xs font-black uppercase"
              style={{ letterSpacing: "0.3em" }}
            >
              Policy
            </p>
            <ul className="grid grid-cols-1 gap-2 text-sm">
              {POLICY_LINKS.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    className="transition-colors hover:text-brand-pink"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Business info */}
        <div className="mt-16 border-border border-t pt-8 text-fg-subtle text-xs leading-relaxed">
          <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="font-black uppercase" style={{ letterSpacing: "0.2em" }}>
                상호
              </dt>
              <dd className="mt-1">
                {COMPANY.nameKr}({COMPANY.nameEn})
              </dd>
            </div>
            <div>
              <dt className="font-black uppercase" style={{ letterSpacing: "0.2em" }}>
                대표자
              </dt>
              <dd className="mt-1">{COMPANY.ceo}</dd>
            </div>
            <div>
              <dt className="font-black uppercase" style={{ letterSpacing: "0.2em" }}>
                사업자등록번호
              </dt>
              <dd className="mt-1">{COMPANY.bizNo}</dd>
            </div>
            <div>
              <dt className="font-black uppercase" style={{ letterSpacing: "0.2em" }}>
                통신판매업 신고
              </dt>
              <dd className="mt-1">{COMPANY.ecommerceNo}</dd>
            </div>
          </dl>

          <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-[auto_1fr]">
            <dt className="font-black uppercase" style={{ letterSpacing: "0.2em" }}>
              주소
            </dt>
            <dd>{COMPANY.address}</dd>

            <dt className="font-black uppercase" style={{ letterSpacing: "0.2em" }}>
              이메일
            </dt>
            <dd>
              <a
                href={`mailto:${COMPANY.email}`}
                className="transition-colors hover:text-brand-pink"
              >
                {COMPANY.email}
              </a>
            </dd>
          </dl>

          <p className="mt-8">
            © {new Date().getFullYear()} {COMPANY.nameEn}. All rights reserved.
          </p>
        </div>
      </Container>
    </footer>
  );
}
