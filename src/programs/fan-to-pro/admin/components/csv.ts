import type { ApplicantRow } from "../types";

const COLUMNS: ReadonlyArray<{
  key: keyof ApplicantRow;
  label: string;
}> = [
  { key: "createdAt", label: "신청일" },
  { key: "name", label: "이름" },
  { key: "email", label: "이메일" },
  { key: "phone", label: "연락처" },
  { key: "birthdate", label: "생년월일" },
  { key: "nationality", label: "국적" },
  { key: "university", label: "대학" },
  { key: "visa", label: "비자" },
  { key: "address", label: "주소" },
  { key: "status", label: "상태" },
  { key: "notifiedAt", label: "안내발송시각" },
  { key: "reminderCount", label: "리마인드회수" },
  { key: "lastReminderAt", label: "최근리마인드" },
  { key: "paymentDueAt", label: "입금마감" },
  { key: "paymentConfirmedAt", label: "입금확인시각" },
  { key: "paidAmountKrw", label: "입금금액" },
  { key: "depositorNameObserved", label: "입금자명" },
  { key: "paidConfirmedBy", label: "확인운영자" },
  { key: "cancelledAt", label: "취소시각" },
  { key: "cancelReason", label: "취소사유" },
  { key: "refundedAt", label: "환불시각" },
  { key: "refundTxnId", label: "환불거래ID" },
  { key: "notes", label: "메모" },
];

function escape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
}

export function rowsToCsv(rows: ApplicantRow[]): string {
  const header = COLUMNS.map((c) => escape(c.label)).join(",");
  const body = rows
    .map((row) =>
      COLUMNS.map((c) => escape(row[c.key] as unknown)).join(","),
    )
    .join("\r\n");
  // BOM 추가 - Excel 한글 깨짐 방지.
  return `﻿${header}\r\n${body}\r\n`;
}

export function csvFilename(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = now.getFullYear();
  const m = pad(now.getMonth() + 1);
  const d = pad(now.getDate());
  const hh = pad(now.getHours());
  const mm = pad(now.getMinutes());
  return `applicants-${y}${m}${d}-${hh}${mm}.csv`;
}

export function downloadCsv(rows: ApplicantRow[]) {
  const csv = rowsToCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = csvFilename();
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // 짧은 지연 후 revoke - Safari 안정성.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
