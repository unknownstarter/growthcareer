import type { Metadata } from "next";
import Link from "next/link";
import {
  ENROLLMENT_CAP,
  REFUND_POLICY,
} from "@/src/programs/fan-to-pro/domain/program";
import { PRICING, formatKRW } from "@/src/programs/fan-to-pro/domain/pricing";

export const metadata: Metadata = {
  title: "이용약관",
  description:
    "Dropdown(드롭다운)이 운영하는 growthcareer.xyz 및 Fan to Pro 프로그램 이용약관.",
  alternates: { canonical: "/terms" },
};

const EFFECTIVE = "2026-04-29";

export default function TermsPage() {
  return (
    <main className="bg-bg text-fg">
      <div className="mx-auto max-w-3xl px-6 py-24 sm:py-32">
        <p
          className="text-fg-subtle text-xs uppercase mb-4"
          style={{ letterSpacing: "0.3em" }}
        >
          Terms of Service
        </p>
        <h1
          className="mb-4 font-black text-4xl sm:text-5xl"
          style={{ letterSpacing: "-0.04em", lineHeight: 1.05 }}
        >
          이용약관
        </h1>
        <p className="mb-12 text-fg-muted text-sm">
          시행일 · 최종 갱신: {EFFECTIVE}
        </p>

        <div className="space-y-12 text-fg-muted leading-relaxed">
          <Section n="01" title="목적">
            <p>
              본 약관은 드롭다운(Dropdown, 이하 &ldquo;회사&rdquo;)이 운영하는
              growthcareer.xyz(이하 &ldquo;사이트&rdquo;) 및 사이트를 통해 제공되는
              Fan to Pro 프로그램(이하 &ldquo;프로그램&rdquo;)의 이용에 관한 회사와
              이용자 간의 권리·의무 및 책임 사항, 기타 필요한 사항을 정함을 목적으로
              합니다.
            </p>
          </Section>

          <Section n="02" title="용어의 정의">
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong className="text-fg">&ldquo;회사&rdquo;</strong> — 드롭다운(Dropdown).
                growthcareer.xyz 의 개발 및 운영 주체.
              </li>
              <li>
                <strong className="text-fg">&ldquo;사이트&rdquo;</strong> —
                growthcareer.xyz 도메인을 통해 제공되는 모든 페이지와 기능의 총칭.
              </li>
              <li>
                <strong className="text-fg">&ldquo;프로그램&rdquo;</strong> —
                Fan to Pro. 회사가 운영하는 K-pop 엔터테인먼트 직무 교육 프로그램.
              </li>
              <li>
                <strong className="text-fg">&ldquo;DEEPI&rdquo;</strong> — 강사 섭외
                등 프로그램 운영을 지원하는 협력 파트너. 유니온 픽처스의 자회사.
              </li>
              <li>
                <strong className="text-fg">&ldquo;유니온 픽처스&rdquo;</strong> —
                Union Pictures. 수료증 발급 주체이자 K-pop 공연 프로젝트 운영사.
                일정 기준을 충족한 수료자에게 공연 프로젝트 실무 체험 기회를
                제공합니다.
              </li>
              <li>
                <strong className="text-fg">&ldquo;이용자&rdquo;</strong> — 사이트에
                접속하거나 프로그램을 신청한 자.
              </li>
            </ul>
          </Section>

          <Section n="03" title="약관의 효력 및 변경">
            <p>
              본 약관은 사이트에 게시함으로써 효력이 발생합니다. 회사는 관련 법령에
              위배되지 않는 범위에서 약관을 변경할 수 있으며, 변경 시 시행일 7일 전
              사이트에 공지합니다. 이용자에게 불리한 변경의 경우 30일 전 공지하고
              이메일 등 개별 통지 가능한 수단으로 별도 안내합니다.
            </p>
          </Section>

          <Section n="04" title="회사·파트너의 역할">
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong className="text-fg">회사 (Dropdown)</strong> — 사이트 개발
                및 운영, 신청 접수, 수강료 결제 수령(예금주), 강의 일정 및 수료
                관리, 데이터 관리, 이용자 응대, 약관·개인정보 처리방침 책임.
              </li>
              <li>
                <strong className="text-fg">DEEPI</strong> — 강사 섭외 등 프로그램
                운영을 지원하는 협력 파트너. 수강생 개인정보는 위탁받지 않음.
              </li>
              <li>
                <strong className="text-fg">유니온 픽처스</strong> — 출석률 90%
                이상 수료자에게 K-pop 공연 프로젝트 실무 체험 기회 제공 및 공연
                프로젝트 참여 확인서 발급.
              </li>
            </ul>
          </Section>

          <Section n="05" title="신청 절차">
            <ol className="list-decimal pl-6 space-y-1">
              <li>사이트의 신청 폼 작성 및 약관·개인정보 처리방침 동의</li>
              <li>회사가 24시간 이내 결제 안내 메일 발송 (예금주: Dropdown · 토스뱅크 1002-4759-1521)</li>
              <li>이용자가 안내된 계좌로 수강료 입금</li>
              <li>입금 확인 후 자리 확정 및 카카오톡 오픈채팅 입장 안내</li>
              <li>오리엔테이션 및 강의 일정 공지</li>
            </ol>
            <p>
              자리는 <strong className="text-fg">입금 순서대로 확정</strong>되며,
              정원이 마감되면 다음 기수 대기열로 자동 전환됩니다.
            </p>
          </Section>

          <Section n="06" title="결제" idAnchor="payment">
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong className="text-fg">수강료</strong>: {formatKRW(PRICING.discounted)}
                {" "}(VAT 포함, 1인 1회 결제, 분할 결제 불가)
              </li>
              <li>
                <strong className="text-fg">결제 수단</strong>: 국내 원화 계좌이체
                {" "}<em>한정</em>. 신용카드, 체크카드, 해외 발급 카드, 페이팔, USD,
                암호화폐 결제는 지원되지 않습니다.
              </li>
              <li>
                <strong className="text-fg">예금주</strong>:{" "}
                {PRICING.bank.accountHolder}. 은행명·계좌번호는 신청 폼 제출 후
                24시간 이내 안내 메일로 전달.
              </li>
              <li>
                <strong className="text-fg">현금영수증/세금계산서</strong>: 발행
                필요 시 입금 안내 메일에 회신해 요청.
              </li>
            </ul>
          </Section>

          <Section n="07" title="환불 정책" idAnchor="refund-policy">
            <p>
              본 환불 기준은「학원의 설립·운영 및 과외교습에 관한 법률 시행령
              별표 4」와 공정거래위원회 「소비자분쟁해결기준」(교육서비스 분야)을
              따릅니다. 또한 「전자상거래 등에서의 소비자보호에 관한 법률」 제17조
              청약철회권을 명시적으로 보장합니다.
            </p>
            <table className="w-full border-collapse border border-border text-sm mt-4">
              <thead className="bg-surface">
                <tr>
                  <th className="border border-border p-3 text-left font-black">
                    시점
                  </th>
                  <th className="border border-border p-3 text-left font-black">
                    환불 비율
                  </th>
                </tr>
              </thead>
              <tbody>
                {REFUND_POLICY.schedule.map((s) => (
                  <tr key={s.phase}>
                    <td className="border border-border p-3">{s.phase}</td>
                    <td className="border border-border p-3 font-black text-fg">
                      {s.refund}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 text-sm">
              환불 요청은{" "}
              <a
                href="mailto:hello@dropdown.xyz"
                className="text-brand-pink hover:underline"
              >
                hello@dropdown.xyz
              </a>
              {" "}로 본인 확인 후 진행되며, 본인 명의 계좌로 영업일 기준 7일 이내
              처리됩니다. 환불 송금 수수료는 회사가 부담합니다.
            </p>
          </Section>

          <Section n="08" title="강좌 자동 취소 (정원 미달)">
            <p>
              본 프로그램은 총 <strong className="text-fg">{ENROLLMENT_CAP.totalSeats}인</strong>{" "}
              모집이며, 수강 시작일{" "}
              <strong className="text-fg">{ENROLLMENT_CAP.cutoffDaysBeforeStart}일 전</strong>{" "}
              시점에 결제 완료 신청자가{" "}
              <strong className="text-fg">{ENROLLMENT_CAP.minToProceed}명 미만</strong>이면
              회사는 강좌를 취소하고, 이미 결제한 이용자에게 결제 금액을 전액 자동
              환불합니다. 이 경우 환불 송금 수수료는 회사가 부담합니다.
            </p>
          </Section>

          <Section n="09" title="출석률 조건부 공연 프로젝트 체험">
            <p>
              본 프로그램의 정규 구성은 <strong className="text-fg">4주 강의 +
              수료증 + 네트워킹</strong>입니다. K-pop 공연 프로젝트 실무 체험은
              회사가 제공하는 정규 교육의 일부가 아니며, 유니온 픽처스가 운영하는
              별도 프로젝트입니다.
            </p>
            <p>
              체험 자격은 <strong className="text-fg">강의 출석률 90% 이상의
              수료자</strong>에 한해 부여되며, 별도 신청 의사를 밝힌 이용자를
              대상으로 유니온 픽처스가 매칭을 진행합니다. 별도 결제는 발생하지
              않습니다. 체험 일정·역할·인원은 유니온 픽처스의 운영 사정에 따라
              조정될 수 있습니다.
            </p>
          </Section>

          <Section n="10" title="이용자의 의무">
            <ul className="list-disc pl-6 space-y-1">
              <li>신청 시 본인의 정확한 정보를 입력해야 합니다.</li>
              <li>
                강의 자료 · 수업 녹화 · 멘토링 자료 등은 개인 학습 목적 외 무단
                복제·배포·공유할 수 없습니다.
              </li>
              <li>
                다른 수강생 · 멘토 · 관계자를 향한 차별·괴롭힘·명예훼손 행위가
                확인되는 경우 즉시 제명될 수 있으며, 이 경우 환불은 학원법 시행령
                별표 4 기준에 따라 비례 적용됩니다.
              </li>
              <li>
                공연 프로젝트 체험에 참여하는 경우 유니온 픽처스가 별도로 안내하는
                현장 안전 수칙 및 보안 의무를 준수해야 합니다.
              </li>
            </ul>
          </Section>

          <Section n="11" title="회사의 의무">
            <ul className="list-disc pl-6 space-y-1">
              <li>회사는 안정적인 사이트 운영과 강의 진행을 위해 최선을 다합니다.</li>
              <li>회사는 이용자의 개인정보를 본 약관 및 개인정보처리방침에 따라 보호합니다.</li>
              <li>
                회사는 이용자의 정당한 의견·불만을 신속히 처리하며, 즉시 처리 곤란
                시 그 사유와 처리 일정을 알립니다.
              </li>
            </ul>
          </Section>

          <Section n="12" title="지적재산권">
            <p>
              사이트 및 프로그램에서 제공되는 강의 자료, 영상, 텍스트, 디자인,
              로고, 수료증 디자인 등 일체의 저작권은 회사 및 파트너(유니온
              픽처스)에게 귀속됩니다. 이용자는 사적 학습 목적 이외의 용도로 이를
              복제·전송·배포·공연·전시할 수 없습니다.
            </p>
          </Section>

          <Section n="13" title="면책 조항">
            <ul className="list-disc pl-6 space-y-1">
              <li>
                회사는 천재지변, 전쟁, 정부의 명령, 통신 장애 등 불가항력으로 인한
                강의 일정 변경·중단에 대해 책임을 지지 않습니다. 이 경우 잔여
                강의는 별도 일정으로 보충하거나 비율 환불합니다.
              </li>
              <li>
                회사는 이용자의 비자 변경, 출입국 사유, 학사 일정 등 개인 사정으로
                인한 수강 차질에 대해 책임을 지지 않습니다.
              </li>
              <li>
                회사는 프로그램 수료가 취업, 비자 연장, 자격증 취득 등을 보장하지
                않음을 명시합니다.
              </li>
            </ul>
          </Section>

          <Section n="14" title="분쟁 해결 및 준거법">
            <p>
              본 약관 및 프로그램 이용과 관련해 분쟁이 발생할 경우 회사와 이용자는
              상호 협의를 통해 해결합니다. 협의가 이루어지지 않을 경우 한국
              소비자원·공정거래위원회의 분쟁조정 절차를 우선 시도하며, 그럼에도
              해결되지 않는 경우 「민사소송법」상 회사 본사 소재지를 관할하는 법원을
              제1심 관할 법원으로 합니다. 본 약관에는 대한민국 법령이 적용됩니다.
            </p>
          </Section>

          <Section n="15" title="부칙">
            <p>본 약관은 {EFFECTIVE}부터 시행됩니다.</p>
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
          <Link href="/privacy" className="text-fg-muted hover:text-brand-pink">
            개인정보처리방침
          </Link>
        </div>
      </div>
    </main>
  );
}

function Section({
  n,
  title,
  idAnchor,
  children,
}: {
  n: string;
  title: string;
  idAnchor?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={idAnchor}
      className="border-t border-border pt-8 first:border-0 first:pt-0 scroll-mt-24"
    >
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
