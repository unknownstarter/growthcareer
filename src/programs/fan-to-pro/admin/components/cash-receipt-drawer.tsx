"use client";

/**
 * 현금영수증 발급 drawer - B0018 Wave 1 T2.
 *
 * 동작:
 *   1) drawer 가 열리면 listCashReceipts 로 기존 발급 이력 fetch.
 *   2) "신규 발급 기록" 폼: 발급 금액 + 홈택스 발급 번호 + 발급일 + 메모.
 *   3) 기존 이력 list (날짜 desc) 표시.
 *
 * UX:
 *   - 발급 금액 default = applicant.paidAmountKrw ?? 880000.
 *   - 발급일 default = today (YYYY-MM-DD KST).
 *   - 홈택스 외부 링크 1개 노출 (운영자가 발급 후 번호 복사).
 *
 * 검증:
 *   - 금액 > 0 (zod 가 server 에서 한 번 더 확인).
 *   - 홈택스 번호는 선택. 길이 60자 이내.
 */

import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "./modal";
import { cn } from "@/src/programs/fan-to-pro/presentation/components/cn";
import { listCashReceipts } from "@/src/programs/fan-to-pro/application/admin-actions";
import type { ApplicantRow, CashReceiptRow } from "../types";

const HOMETAX_URL =
  "https://hometax.go.kr/websquare/websquare.wq?w2xPath=/ui/pp/index_pp.xml";

const fieldClass =
  "w-full border border-border bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-brand-pink disabled:opacity-50";

const labelClass = "block text-[10px] font-black uppercase text-fg/80";
const labelStyle = { letterSpacing: "0.2em" } as const;

const primaryBtn =
  "inline-flex items-center justify-center gap-2 bg-brand-pink px-4 py-2.5 text-xs font-black uppercase text-fg hover:bg-brand-purple disabled:opacity-60";

const ghostBtn =
  "inline-flex items-center justify-center border border-border bg-bg px-4 py-2.5 text-xs font-black uppercase text-fg hover:text-fg disabled:opacity-40";

const btnStyle = { letterSpacing: "0.15em" } as const;

function todayInKst(): string {
  // KST = UTC+9. 운영자가 한국에서 작업한다고 가정.
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function formatReceiptDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const pad = (n: number) => String(n).padStart(2, "0");
  // 발급일은 일자 단위 정확도면 충분.
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function CashReceiptDrawer({
  open,
  busy,
  applicant,
  onClose,
  onSubmit,
  // Refresh trigger - submit 직후 server 가 새 row 를 INSERT 했으므로
  // drawer 가 다시 fetch 해서 이력에 표시.
  refreshKey,
}: {
  open: boolean;
  busy: boolean;
  applicant: ApplicantRow;
  onClose: () => void;
  onSubmit: (input: {
    amountKrw: number;
    hometaxReceiptNo?: string;
    issuedAt?: string;
    notes?: string;
  }) => void;
  refreshKey: number;
}) {
  const defaultAmount = applicant.paidAmountKrw ?? 880_000;
  const [amount, setAmount] = useState<string>(String(defaultAmount));
  const [receiptNo, setReceiptNo] = useState<string>("");
  const [issuedAt, setIssuedAt] = useState<string>(todayInKst());
  const [notes, setNotes] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // 발급 이력 로딩.
  const [history, setHistory] = useState<CashReceiptRow[] | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setHistoryLoading(true);
    setHistoryError(null);
    listCashReceipts({ id: applicant.id })
      .then((res) => {
        if (cancelled) return;
        if (res.status === "ok") {
          setHistory(res.rows);
        } else {
          setHistoryError(res.error);
        }
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, applicant.id, refreshKey]);

  // applicant 가 바뀌면 폼 초기화.
  useEffect(() => {
    if (!open) return;
    setAmount(String(applicant.paidAmountKrw ?? 880_000));
    setReceiptNo("");
    setIssuedAt(todayInKst());
    setNotes("");
    setError(null);
  }, [applicant.id, applicant.paidAmountKrw, open]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const numeric = Number(amount.replace(/[\s,]/g, ""));
    if (!Number.isInteger(numeric) || numeric <= 0) {
      setError("발급 금액은 양의 정수여야 해요.");
      return;
    }
    if (receiptNo.trim().length > 60) {
      setError("홈택스 발급 번호는 60자 이내여야 해요.");
      return;
    }
    if (issuedAt && !/^\d{4}-\d{2}-\d{2}$/.test(issuedAt)) {
      setError("발급일은 YYYY-MM-DD 형식이어야 해요.");
      return;
    }
    setError(null);
    onSubmit({
      amountKrw: numeric,
      hometaxReceiptNo: receiptNo.trim() || undefined,
      issuedAt: issuedAt || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${applicant.name} 현금영수증`}
      busy={busy}
      size="lg"
    >
      <div className="flex flex-col gap-5">
        {/* 신청자 컨텍스트 */}
        <div className="grid grid-cols-1 gap-2 border border-border bg-bg/40 p-3 text-[11px] text-fg sm:grid-cols-3">
          <div>
            <span className={labelClass} style={labelStyle}>
              이메일
            </span>
            <div className="text-fg break-all">{applicant.email}</div>
          </div>
          <div>
            <span className={labelClass} style={labelStyle}>
              입금 확인
            </span>
            <div className="text-fg">
              {applicant.paidAmountKrw
                ? `${applicant.paidAmountKrw.toLocaleString()}원`
                : "-"}
            </div>
          </div>
          <div>
            <span className={labelClass} style={labelStyle}>
              상태
            </span>
            <div className="text-fg uppercase">{applicant.status}</div>
          </div>
        </div>

        {/* 홈택스 외부 링크 안내 */}
        <div className="flex flex-col gap-1 border border-brand-pink/40 bg-brand-pink/[0.06] p-3 text-xs text-fg">
          <p className="text-fg">
            홈택스에서 자진발급한 후 발급 번호를 아래에 기록해 주세요.
          </p>
          <a
            href={HOMETAX_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-pink underline hover:text-brand-purple"
          >
            홈택스 현금영수증 발급 →
          </a>
        </div>

        {/* 신규 발급 기록 폼 */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <h3
            className="text-[11px] font-black uppercase text-fg/80"
            style={{ letterSpacing: "0.2em" }}
          >
            신규 발급 기록
          </h3>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={labelClass} style={labelStyle}>
                발급 금액 (원)
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={fieldClass}
                disabled={busy}
                autoFocus
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={labelClass} style={labelStyle}>
                발급일
              </span>
              <input
                type="date"
                value={issuedAt}
                onChange={(e) => setIssuedAt(e.target.value)}
                className={fieldClass}
                disabled={busy}
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className={labelClass} style={labelStyle}>
              홈택스 발급 번호 (선택)
            </span>
            <input
              type="text"
              value={receiptNo}
              onChange={(e) => setReceiptNo(e.target.value)}
              className={fieldClass}
              placeholder="예: 12345-67890-...  미입력 시 추후 기재 가능"
              disabled={busy}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={labelClass} style={labelStyle}>
              메모 (선택)
            </span>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={cn(fieldClass, "resize-y")}
              placeholder="분할 발급 / 오발급 정정 등 사유"
              disabled={busy}
            />
          </label>

          {error ? (
            <p
              role="alert"
              className="border border-brand-pink bg-brand-pink/10 px-3 py-2 text-xs text-brand-pink"
            >
              {error}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className={ghostBtn}
              style={btnStyle}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={busy}
              className={primaryBtn}
              style={btnStyle}
            >
              {busy ? "처리 중..." : "발급 기록 저장"}
            </button>
          </div>
        </form>

        {/* 발급 이력 */}
        <section className="flex flex-col gap-2 border-t border-border pt-4">
          <h3
            className="text-[11px] font-black uppercase text-fg/80"
            style={{ letterSpacing: "0.2em" }}
          >
            발급 이력 {history ? `(${history.length}건)` : ""}
          </h3>
          {historyLoading ? (
            <p className="text-xs text-fg/80">불러오는 중...</p>
          ) : historyError ? (
            <p className="border border-brand-pink bg-brand-pink/10 px-3 py-2 text-xs text-brand-pink">
              이력 로드 오류: {historyError}
            </p>
          ) : !history || history.length === 0 ? (
            <p className="text-xs text-fg/80">아직 발급 이력이 없어요.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {history.map((row) => (
                <li
                  key={row.id}
                  className="border border-border bg-bg/40 px-3 py-2 text-xs"
                >
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-fg font-bold">
                      {formatReceiptDate(row.issuedAt)}
                    </span>
                    <span className="text-fg">
                      {row.amountKrw.toLocaleString()}원
                    </span>
                    {row.hometaxReceiptNo ? (
                      <span className="text-fg">
                        홈택스 번호: {row.hometaxReceiptNo}
                      </span>
                    ) : (
                      <span className="text-fg/80">홈택스 번호 미기재</span>
                    )}
                  </div>
                  {row.notes ? (
                    <p className="mt-1 text-fg">{row.notes}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Modal>
  );
}
