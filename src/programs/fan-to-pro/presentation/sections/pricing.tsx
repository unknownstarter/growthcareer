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
        <Eyebrow n="12">Pricing</Eyebrow>

        <h2
          className="mb-12 max-w-4xl font-black text-display-lg"
          style={{ lineHeight: 1.05, letterSpacing: "-0.04em" }}
        >
          한 달.
          <br />
          단 한 번.
        </h2>

        <p className="mb-16 max-w-2xl text-base leading-relaxed text-fg/90 sm:text-lg">
          신용카드 X. 해외 카드 X. 카운트다운 X.
          <br />
          <span className="font-black">선착순 입금 순서</span>로 자리가 확정된다.
        </p>

        {/* 단일 컬럼 가격 카드 — 옵션 B (스택형) */}
        <div className="mx-auto max-w-3xl bg-bg p-8 text-fg sm:p-14">
          <p
            className="mb-4 text-fg-subtle text-xs uppercase"
            style={{ letterSpacing: "0.3em" }}
          >
            4주 정규 + 수료 혜택
          </p>

          <div className="mb-6 flex flex-wrap items-end gap-4">
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
            className="mb-3 font-black text-fg leading-none"
            style={{
              fontSize: "var(--text-display-lg)",
              letterSpacing: "-0.05em",
            }}
          >
            {formatKRW(PRICING.discounted)}
          </p>
          <p className="mb-10 text-fg-muted text-sm sm:text-base">
            VAT 포함 · 계좌이체 (국내 원화) · 1인 1회 결제 · 분할 결제 X
          </p>

          <Button
            href="#apply"
            variant="primary"
            size="xl"
            className="w-full"
          >
            지금 신청 →
          </Button>

          {/* 환불 보장 — 푸터 위치 */}
          <div className="mt-10 border-t border-border pt-8">
            <p
              className="mb-5 text-fg-subtle text-[10px] font-black uppercase sm:text-xs"
              style={{ letterSpacing: "0.3em" }}
            >
              환불 보장
            </p>
            <ul className="grid grid-cols-1 gap-3 text-sm text-fg-muted sm:text-base">
              <li className="flex items-start gap-3">
                <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 bg-brand-pink" />
                <span>{REFUND_POLICY.fullRefundLabel}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 bg-brand-pink" />
                <span>{ENROLLMENT_CAP.autoRefundNote}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 bg-brand-pink" />
                <span>입금 순서대로 자리 확정 / 정원 마감 시 다음 기수 대기열</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 bg-brand-pink" />
                <span>입금 확인 후 카카오톡 오픈채팅 자동 입장</span>
              </li>
            </ul>
          </div>

          {/* 결제 안내 — 미니 메타 */}
          <div className="mt-8 grid grid-cols-1 gap-6 border-border border-t pt-6 sm:grid-cols-2">
            <div>
              <p
                className="mb-2 text-fg-subtle text-[10px] font-black uppercase sm:text-xs"
                style={{ letterSpacing: "0.3em" }}
              >
                결제 안내
              </p>
              <p className="text-fg-muted text-xs leading-relaxed sm:text-sm">
                예금주{" "}
                <span className="font-black text-fg">
                  {PRICING.bank.accountHolder}
                </span>
                . 은행명 · 계좌번호는 신청 폼 제출 후 안내 메일과 결제 페이지에서
                확인 가능.
              </p>
            </div>
            <div>
              <p
                className="mb-2 text-fg-subtle text-[10px] font-black uppercase sm:text-xs"
                style={{ letterSpacing: "0.3em" }}
              >
                지원되지 않는 결제 수단
              </p>
              <p className="text-fg-muted text-xs leading-relaxed sm:text-sm">
                신용 · 체크 · 해외 발급 카드 / 페이팔 · USD · 암호화폐
              </p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
