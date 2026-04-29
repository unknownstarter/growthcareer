import { PRICING, discountRate, formatKRW } from "@/src/programs/fan-to-pro/domain/pricing";
import {
  ENROLLMENT_CAP,
  REFUND_POLICY,
} from "@/src/programs/fan-to-pro/domain/program";
import { Button } from "../ui/button";
import { Container } from "../ui/container";
import { Eyebrow } from "../ui/eyebrow";

export function Pricing() {
  const off = discountRate(PRICING.original, PRICING.discounted);

  return (
    <section className="section-pink px-6 py-28 sm:px-10 sm:py-36">
      <Container>
        <Eyebrow n="10">Pricing</Eyebrow>

        <h2
          className="mb-12 max-w-4xl font-black text-display-lg"
          style={{ lineHeight: 1.05, letterSpacing: "-0.04em" }}
        >
          단 한 번.
          <br />
          한 시즌.
        </h2>

        <p className="mb-16 max-w-2xl text-base leading-relaxed text-fg/90 sm:text-lg">
          신용카드 X. 해외 카드 X. 카운트다운 X.
          <br />
          <span className="font-black">선착순 입금 순서</span>로 자리가 확정된다.
        </p>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
          {/* 가격 카드 */}
          <div className="bg-bg p-8 text-fg sm:p-12">
            <p
              className="mb-3 text-fg-subtle text-xs uppercase"
              style={{ letterSpacing: "0.3em" }}
            >
              한 시즌 풀 패키지
            </p>

            <div className="mb-8 flex flex-wrap items-end gap-4">
              <span
                className="text-fg-subtle text-2xl line-through sm:text-3xl"
                aria-label={`정가 ${formatKRW(PRICING.original)}`}
              >
                {formatKRW(PRICING.original)}
              </span>
              <span className="bg-brand-pink px-2 py-1 font-black text-fg text-sm">
                {off}% OFF
              </span>
            </div>

            <p
              className="mb-2 font-black text-fg leading-none"
              style={{
                fontSize: "var(--text-display-md)",
                letterSpacing: "-0.05em",
              }}
            >
              {formatKRW(PRICING.discounted)}
            </p>
            <p className="mb-10 text-fg-muted text-sm">
              VAT 포함 · 1인 1회 결제 · 분할 결제 X
            </p>

            <Button
              href="#apply"
              variant="primary"
              size="xl"
              className="w-full"
            >
              지금 신청 →
            </Button>

            <ul className="mt-8 grid grid-cols-1 gap-2 text-sm text-fg-muted sm:grid-cols-2">
              {[
                "정원 마감 시 즉시 다음 기수 대기열",
                "입금 순서대로 자리 확정",
                `${REFUND_POLICY.fullRefundLabel}`,
                "입금 후 카카오톡 오픈채팅 자동 입장",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 block h-1 w-1 shrink-0 bg-brand-pink" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <p
              id="enrollment-cap"
              className="mt-8 border-t border-border pt-4 text-fg-subtle text-[11px] leading-relaxed"
              style={{ letterSpacing: "0.02em" }}
            >
              * {ENROLLMENT_CAP.autoRefundNote}
            </p>
          </div>

          {/* 결제 안내 카드 */}
          <div className="flex flex-col gap-6 bg-bg p-8 text-fg sm:p-10">
            <div>
              <p
                className="mb-3 text-fg-subtle text-xs uppercase"
                style={{ letterSpacing: "0.3em" }}
              >
                결제 방식
              </p>
              <p className="font-black text-2xl sm:text-3xl">
                계좌이체
                <br />
                <span className="text-brand-pink">국내 원화 한정</span>
              </p>
            </div>

            <div className="border-t border-border pt-6">
              <p
                className="mb-2 text-fg-subtle text-xs uppercase"
                style={{ letterSpacing: "0.3em" }}
              >
                예금주
              </p>
              <p className="font-black text-fg text-xl">
                {PRICING.bank.accountHolder}
              </p>
              <p className="mt-4 text-fg-muted text-sm leading-relaxed">
                {PRICING.bank.bankName && PRICING.bank.accountNumber
                  ? `${PRICING.bank.bankName} · ${PRICING.bank.accountNumber}`
                  : "은행명 · 계좌번호는 신청 폼 제출 후 24시간 이내 안내 메일에서 확인할 수 있습니다."}
              </p>
            </div>

            <div className="mt-auto border-border border-t pt-6">
              <p
                className="mb-2 text-fg-subtle text-xs uppercase"
                style={{ letterSpacing: "0.3em" }}
              >
                지원되지 않는 결제 수단
              </p>
              <ul className="text-fg-muted text-sm">
                <li>· 신용카드 / 체크카드</li>
                <li>· 해외 발급 카드</li>
                <li>· 페이팔 · USD · 암호화폐</li>
              </ul>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
