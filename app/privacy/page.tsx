import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description:
    "Dropdown(드롭다운)이 운영하는 growthcareer.xyz 및 Fan to Pro 프로그램의 개인정보 처리 방침.",
  alternates: { canonical: "/privacy" },
};

const EFFECTIVE = "2026-04-29";

export default function PrivacyPage() {
  return (
    <main className="bg-bg text-fg">
      <div className="mx-auto max-w-3xl px-6 py-24 sm:py-32">
        <p
          className="text-fg-subtle text-xs uppercase mb-4"
          style={{ letterSpacing: "0.3em" }}
        >
          Privacy Policy
        </p>
        <h1
          className="mb-4 font-black text-4xl sm:text-5xl"
          style={{ letterSpacing: "-0.04em", lineHeight: 1.05 }}
        >
          개인정보처리방침
        </h1>
        <p className="mb-12 text-fg-muted text-sm">
          시행일 · 최종 갱신: {EFFECTIVE}
        </p>

        <div className="space-y-12 text-fg-muted leading-relaxed">
          <Section n="01" title="총칙">
            <p>
              드롭다운(Dropdown, 이하 &ldquo;회사&rdquo;)은 growthcareer.xyz 웹사이트
              (이하 &ldquo;사이트&rdquo;) 및 사이트를 통해 제공되는 Fan to Pro
              프로그램(이하 &ldquo;프로그램&rdquo;) 운영 과정에서 수집되는 개인정보를
              본 방침에 따라 처리합니다.
            </p>
            <p>
              회사는 「개인정보 보호법」, 「정보통신망 이용촉진 및 정보보호 등에
              관한 법률」, 「전자상거래 등에서의 소비자보호에 관한 법률」을 비롯한
              관련 법령을 준수합니다.
            </p>
          </Section>

          <Section n="02" title="수집하는 개인정보 항목">
            <SubHeading>가. 신청 시 이용자가 직접 제공하는 항목</SubHeading>
            <ul className="list-disc pl-6 space-y-1">
              <li>이름, 이메일, 휴대전화 번호</li>
              <li>생년월일</li>
              <li>재학/졸업 대학</li>
              <li>비자 상태 (D-2, D-4, F-2, F-4, F-6, 기타)</li>
              <li>거주지</li>
              <li>약관 동의 여부 및 동의 일시</li>
            </ul>

            <SubHeading>나. 결제 처리 과정에서 추가 수집되는 항목</SubHeading>
            <ul className="list-disc pl-6 space-y-1">
              <li>입금자명, 입금 일시, 입금액</li>
              <li>환불 발생 시 환불 계좌 정보(은행명, 계좌번호, 예금주)</li>
            </ul>

            <SubHeading>다. 자동 수집 항목</SubHeading>
            <ul className="list-disc pl-6 space-y-1">
              <li>IP 주소, 접속 로그, 쿠키, 기기 정보, 브라우저 정보</li>
              <li>방문 일시 및 페이지 이동 경로</li>
            </ul>
          </Section>

          <Section n="03" title="개인정보의 처리 목적">
            <ul className="list-disc pl-6 space-y-1">
              <li>프로그램 신청 접수, 본인 확인, 자격 검토</li>
              <li>결제 안내, 입금 확인, 환불 처리</li>
              <li>강의 일정·자료·수료증 안내, 공지 발송</li>
              <li>출석률 산정 및 공연 프로젝트 체험 자격 매칭</li>
              <li>고객 응대, 문의 회신, 분쟁 해결</li>
              <li>비식별 통계 분석 및 서비스 개선</li>
              <li>법령상 의무 이행 (사업자 보존 의무 등)</li>
            </ul>
          </Section>

          <Section n="04" title="개인정보의 처리 위탁">
            <p>
              회사는 안정적인 서비스 제공을 위해 다음 수탁자에게 개인정보 처리를
              위탁하며, 위탁 시 「개인정보 보호법」 제26조에 따라 안전한 처리를
              위한 사항을 명시합니다.
            </p>
            <table className="w-full border-collapse border border-border text-sm mt-4">
              <thead className="bg-surface">
                <tr>
                  <th className="border border-border p-3 text-left font-black">
                    수탁자
                  </th>
                  <th className="border border-border p-3 text-left font-black">
                    위탁 업무
                  </th>
                  <th className="border border-border p-3 text-left font-black">
                    소재지
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-border p-3">Supabase Inc.</td>
                  <td className="border border-border p-3">
                    데이터베이스 호스팅, 신청 정보 저장
                  </td>
                  <td className="border border-border p-3">서울 (ap-northeast-2)</td>
                </tr>
                <tr>
                  <td className="border border-border p-3">Vercel Inc.</td>
                  <td className="border border-border p-3">
                    웹사이트 호스팅, 서버리스 함수 실행
                  </td>
                  <td className="border border-border p-3">글로벌 CDN</td>
                </tr>
                <tr>
                  <td className="border border-border p-3">유니온 픽처스</td>
                  <td className="border border-border p-3">
                    공연 프로젝트 매칭, 공연 프로젝트 참여 확인서 발급 (출석률 90% 이상 수료자 한정)
                  </td>
                  <td className="border border-border p-3">대한민국</td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section n="05" title="개인정보의 제3자 제공">
            <p>
              회사는 이용자의 사전 동의 없이 개인정보를 제3자에게 제공하지 않습니다.
              다만 다음의 경우 별도 동의 없이 제공될 수 있습니다.
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>법령에 특별한 규정이 있거나 수사기관의 적법한 요구가 있는 경우</li>
              <li>
                통계 작성, 학술 연구 등의 목적으로 특정 개인을 식별할 수 없는 형태로
                가공해 제공하는 경우
              </li>
            </ul>
            <p className="mt-4">
              출석률 90% 이상 수료자 중 공연 프로젝트 실무 체험 참여 의사를 밝힌
              이용자에 한해, 매칭 목적으로 이름·연락처·비자 상태가 유니온 픽처스에
              제공됩니다. 이는 별도 동의 절차를 거쳐 진행됩니다.
            </p>
          </Section>

          <Section n="06" title="개인정보의 보유 및 이용 기간">
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong className="text-fg">신청서 (결제 전)</strong> — 신청일로부터
                30일. 이후 결제가 이루어지지 않으면 자동 폐기.
              </li>
              <li>
                <strong className="text-fg">수강 신청서 (결제 완료)</strong> —
                수강 시작일로부터 1년. 이후 식별 정보 폐기, 통계 데이터만 비식별
                형태로 보관.
              </li>
              <li>
                <strong className="text-fg">결제·환불 기록</strong> —
                전자상거래법 §6 에 따라 5년 보관.
              </li>
              <li>
                <strong className="text-fg">소비자 불만 및 분쟁 처리 기록</strong>
                {" "}— 전자상거래법 §6 에 따라 3년 보관.
              </li>
              <li>
                <strong className="text-fg">접속 로그</strong> — 통신비밀보호법에
                따라 3개월 보관.
              </li>
            </ul>
          </Section>

          <Section n="07" title="정보주체의 권리와 행사 방법">
            <p>이용자는 언제든 다음 권리를 행사할 수 있습니다.</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>개인정보 열람 요구</li>
              <li>개인정보 정정·삭제 요구</li>
              <li>개인정보 처리 정지 요구</li>
              <li>동의 철회</li>
            </ul>
            <p className="mt-4">
              요청은{" "}
              <a
                href="mailto:hello@dropdown.xyz"
                className="text-brand-pink hover:underline"
              >
                hello@dropdown.xyz
              </a>{" "}
              로 보내주시면 본인 확인 후 10일 이내에 처리합니다.
            </p>
          </Section>

          <Section n="08" title="쿠키 및 자동 수집 정보">
            <p>
              회사는 이용자에게 맞춤형 서비스를 제공하기 위해 쿠키를 사용합니다.
              브라우저 설정에서 쿠키 저장을 거부하거나 삭제할 수 있으나, 일부 기능
              이용에 제한이 있을 수 있습니다.
            </p>
          </Section>

          <Section n="09" title="안전성 확보 조치">
            <ul className="list-disc pl-6 space-y-1">
              <li>전송 구간 TLS 1.3 암호화</li>
              <li>저장 시 Supabase 의 Row Level Security 적용 및 service role 한정 접근</li>
              <li>관리자 접근 권한 최소화 및 정기 점검</li>
              <li>개인정보 처리 시스템 접속 기록 보관</li>
            </ul>
          </Section>

          <Section n="10" title="개인정보 보호책임자">
            <ul className="list-disc pl-6 space-y-1">
              <li>회사: 드롭다운(Dropdown)</li>
              <li>대표: 황재하</li>
              <li>
                연락처:{" "}
                <a
                  href="mailto:hello@dropdown.xyz"
                  className="text-brand-pink hover:underline"
                >
                  hello@dropdown.xyz
                </a>
              </li>
            </ul>
          </Section>

          <Section n="11" title="권익 침해 구제 방법">
            <p>
              개인정보 침해로 인한 신고나 상담이 필요한 경우 아래 기관에 문의할 수
              있습니다.
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>개인정보침해신고센터 — 국번 없이 118 / privacy.kisa.or.kr</li>
              <li>개인정보 분쟁조정위원회 — 1833-6972 / kopico.go.kr</li>
              <li>대검찰청 사이버수사과 — 1301 / spo.go.kr</li>
              <li>경찰청 사이버수사국 — 182 / ecrm.cyber.go.kr</li>
            </ul>
          </Section>

          <Section n="12" title="개정 이력">
            <ul className="list-disc pl-6 space-y-1">
              <li>2026-04-29 — 최초 시행</li>
            </ul>
          </Section>
        </div>

        <div className="mt-16 border-t border-border pt-8 text-sm">
          <Link
            href="/fan-to-pro"
            className="text-brand-pink hover:underline"
          >
            ← 프로그램 페이지로 돌아가기
          </Link>
          <span className="mx-3 text-fg-subtle">·</span>
          <Link href="/terms" className="text-fg-muted hover:text-brand-pink">
            이용약관
          </Link>
        </div>
      </div>
    </main>
  );
}

function Section({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border pt-8 first:border-0 first:pt-0">
      <div className="mb-6 flex items-baseline gap-4">
        <span
          className="font-black text-brand-pink text-2xl"
          style={{ letterSpacing: "-0.04em" }}
        >
          {n}
        </span>
        <h2
          className="font-black text-fg text-xl sm:text-2xl"
          style={{ letterSpacing: "-0.03em" }}
        >
          {title}
        </h2>
      </div>
      <div className="space-y-4 text-base">{children}</div>
    </section>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-6 mb-3 font-black text-fg text-base">{children}</h3>
  );
}
