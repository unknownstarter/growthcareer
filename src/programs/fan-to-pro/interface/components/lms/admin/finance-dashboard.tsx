"use client";

/**
 * Finance Dashboard - /fan-to-pro/admin/finance.
 *
 * 4 섹션:
 *   1) 손익 KPI (자동 계산) - 매출 / 비용 / 부가세 / 순익
 *   2) 비용 entry CRUD - 추가 / 수정 / 삭제 / 상태 변경 (DataTable + Dialog)
 *   3) 세무 신고 일정 + 상태 - 5종 filing (DataTable)
 *   4) 회계 처리 가이드 - 일반 과세 사업자 (학원 미등록) 안내 (Accordion)
 *
 * 회사 단위 강사 정산은 같은 페이지 하단에 유지 (기존 wire).
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/card";
import { Button } from "@/src/programs/fan-to-pro/interface/components/lms/ui/button";
import { Badge } from "@/src/programs/fan-to-pro/interface/components/lms/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/dialog";
import { Input } from "@/src/programs/fan-to-pro/interface/components/lms/ui/input";
import { Label } from "@/src/programs/fan-to-pro/interface/components/lms/ui/label";
import { Textarea } from "@/src/programs/fan-to-pro/interface/components/lms/ui/textarea";
import { Alert, AlertTitle, AlertDescription } from "@/src/programs/fan-to-pro/interface/components/lms/ui/alert";
import {
  type CohortExpense,
  type ExpenseCategory,
  type ExpenseStatus,
  EXPENSE_CATEGORIES,
  EXPENSE_STATUSES,
  EXPENSE_CATEGORY_LABEL_KO,
  EXPENSE_STATUS_LABEL_KO,
  isCountedAsExpense,
} from "@/src/programs/fan-to-pro/domain/entities/cohort-expense";
import {
  type TaxFiling,
  type FilingStatus,
  FILING_STATUSES,
  FILING_TYPE_LABEL_KO,
  FILING_STATUS_LABEL_KO,
  daysUntilDue,
  isUpcoming,
  isOverdue,
} from "@/src/programs/fan-to-pro/domain/entities/tax-filing";
import {
  createExpenseAction,
  updateExpenseAction,
  deleteExpenseAction,
  updateFilingAction,
} from "@/src/programs/fan-to-pro/interface/server-actions/admin/lms-finance-actions";
import type { CohortRevenue } from "@/src/programs/fan-to-pro/application/queries/cohort/cohort-revenue";
import type { Cohort } from "@/src/programs/fan-to-pro/domain/entities/cohort";

type Props = {
  cohort: Cohort;
  revenue: CohortRevenue;
  expenses: CohortExpense[];
  filings: TaxFiling[];
};

export function FinanceDashboard({ cohort, revenue, expenses, filings }: Props) {
  return (
    <div className="space-y-8">
      <PnlSection cohort={cohort} revenue={revenue} expenses={expenses} />
      <ExpensesSection cohort={cohort} expenses={expenses} />
      <FilingsSection filings={filings} />
      <AccountingGuide />
    </div>
  );
}

/* ────────────────────── Section 1. P&L ────────────────────── */

function PnlSection({
  cohort,
  revenue,
  expenses,
}: {
  cohort: Cohort;
  revenue: CohortRevenue;
  expenses: CohortExpense[];
}) {
  const counted = expenses.filter((e) => isCountedAsExpense(e.status));
  const costExclusive = counted.reduce((s, e) => s + e.amount_krw, 0);
  const vatInput = counted.reduce((s, e) => s + e.vat_krw, 0);

  // 부가세 납부 = 매출세액 - 매입세액 (음수면 환급, 정책상 0 floor 로 표시).
  const vatPayable = revenue.vat_output_krw - vatInput;

  // 순익 (세전) = 부가세 별도 매출 - 부가세 별도 비용 - 부가세 납부 (실 현금 기준).
  // 부가세는 매출에서 받아 매입에 쓴 차액만 납부 → 손익엔 vatPayable 만 영향.
  // (회계상 더 엄밀히는 부가세 별도 매출 - 부가세 별도 비용만으로 PnL 잡고
  //  부가세는 별도 cash flow. 본 dashboard 는 노아 의사결정용 단순화.)
  const profitBeforeTax = revenue.revenue_exclusive_krw - costExclusive;
  // 종합소득세 추정 - 과세표준 14M 이하 6% 단순화 (실제 누진 공식 X).
  const estimatedIncomeTax = profitBeforeTax > 0 ? Math.round(profitBeforeTax * 0.06) : 0;
  const profitAfterTax = profitBeforeTax - estimatedIncomeTax;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">손익 요약 ({cohort.name})</CardTitle>
        <CardDescription>
          매출 = 입금 완료 수강료 합. 비용 = 확정 / 지급 완료 entry 합.
          부가세 (10%) 와 종합소득세 (6%) 추정치 포함.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi label="매출 (VAT 별도)" value={revenue.revenue_exclusive_krw} hint={`입금 ${revenue.paid_count}명`} tone="positive" />
          <Kpi label="비용 (VAT 별도)" value={costExclusive} hint={`${counted.length}건 인정`} tone="negative" />
          <Kpi label="부가세 납부 (예상)" value={Math.max(0, vatPayable)} hint={`매출세액 ${revenue.vat_output_krw.toLocaleString()} - 매입세액 ${vatInput.toLocaleString()}`} tone="neutral" />
          <Kpi label="순익 (세후 추정)" value={profitAfterTax} hint={`세전 ${profitBeforeTax.toLocaleString()} - 소득세 ${estimatedIncomeTax.toLocaleString()}`} tone="positive" />
        </div>

        <div className="rounded-md bg-[var(--muted)] p-4 text-xs text-[var(--muted-foreground)] space-y-1">
          <p><strong>매출 (VAT 포함):</strong> {revenue.revenue_inclusive_krw.toLocaleString("ko-KR")}원 ({revenue.paid_count}명, 환불 {revenue.refunded_count}명 제외)</p>
          <p><strong>매출세액 (1/11):</strong> {revenue.vat_output_krw.toLocaleString("ko-KR")}원 / <strong>매입세액 (vat 합):</strong> {vatInput.toLocaleString("ko-KR")}원</p>
          <p><strong>부가세 납부 = 매출세액 - 매입세액:</strong> {vatPayable.toLocaleString("ko-KR")}원 {vatPayable < 0 ? "(환급)" : ""}</p>
          <p><strong>순익 (세전) = 매출 (VAT 별도) - 비용 (VAT 별도):</strong> {profitBeforeTax.toLocaleString("ko-KR")}원</p>
          <p className="pt-1 border-t border-[var(--border)] mt-1">
            ※ 종합소득세는 누진세 (6%~45%) - 본 추정은 14M 이하 6% 단순화. 실제는 다른 사업소득 / 공제 포함 계산. 세무사 위탁 또는 홈택스 모의 계산 권장.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function Kpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint?: string;
  tone: "positive" | "negative" | "neutral";
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-700"
      : tone === "negative"
      ? "text-red-700"
      : "text-[var(--foreground)]";
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--card)] p-4">
      <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${toneClass}`}>
        {value.toLocaleString("ko-KR")}원
      </p>
      {hint ? <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">{hint}</p> : null}
    </div>
  );
}

/* ────────────────────── Section 2. Expenses CRUD ────────────────────── */

const EMPTY_FORM = {
  category: "instructor_fee" as ExpenseCategory,
  description: "",
  amount_krw: 0,
  vat_krw: 0,
  status: "planned" as ExpenseStatus,
  vendor_name: "",
  vendor_biz_no: "",
  invoice_number: "",
  invoice_issued_at: "",
  paid_at: "",
  paid_via: "",
  receipt_url: "",
  notes: "",
};

type ExpenseForm = typeof EMPTY_FORM;

function ExpensesSection({
  cohort,
  expenses,
}: {
  cohort: Cohort;
  expenses: CohortExpense[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<ExpenseForm>(EMPTY_FORM);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setOpen(true);
  }

  function openEdit(expense: CohortExpense) {
    setEditingId(expense.id);
    setForm({
      category: expense.category,
      description: expense.description,
      amount_krw: expense.amount_krw,
      vat_krw: expense.vat_krw,
      status: expense.status,
      vendor_name: expense.vendor_name ?? "",
      vendor_biz_no: expense.vendor_biz_no ?? "",
      invoice_number: expense.invoice_number ?? "",
      invoice_issued_at: expense.invoice_issued_at ?? "",
      paid_at: expense.paid_at ?? "",
      paid_via: expense.paid_via ?? "",
      receipt_url: expense.receipt_url ?? "",
      notes: expense.notes ?? "",
    });
    setError(null);
    setOpen(true);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      ...form,
      vendor_name: form.vendor_name || null,
      vendor_biz_no: form.vendor_biz_no || null,
      invoice_number: form.invoice_number || null,
      invoice_issued_at: form.invoice_issued_at || null,
      paid_at: form.paid_at || null,
      paid_via: form.paid_via || null,
      receipt_url: form.receipt_url || null,
      notes: form.notes || null,
    };
    startTransition(async () => {
      const result = editingId
        ? await updateExpenseAction({ id: editingId, ...payload })
        : await createExpenseAction({ cohort_id: cohort.id, ...payload });
      if (result.status === "error") {
        setError(`저장 실패: ${result.error}`);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  function onDelete(id: string) {
    if (!confirm("이 비용 entry 를 삭제할까요?")) return;
    startTransition(async () => {
      const result = await deleteExpenseAction({ id });
      if (result.status === "error") {
        alert(`삭제 실패: ${result.error}`);
        return;
      }
      router.refresh();
    });
  }

  function onStatusChange(expense: CohortExpense, status: ExpenseStatus) {
    startTransition(async () => {
      const result = await updateExpenseAction({ id: expense.id, status });
      if (result.status === "error") {
        alert(`상태 변경 실패: ${result.error}`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between space-y-0">
        <div>
          <CardTitle className="text-base">비용 entry ({expenses.length}건)</CardTitle>
          <CardDescription>
            cohort 단위 비용. amount = 부가세 별도, total = amount + vat. status=확정 / 지급 완료 가 손익 인정.
          </CardDescription>
        </div>
        <Button size="sm" onClick={openCreate}>비용 추가</Button>
      </CardHeader>
      <CardContent className="px-0">
        {expenses.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-[var(--muted-foreground)]">
            아직 비용 entry 가 없습니다.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>카테고리</TableHead>
                  <TableHead>설명</TableHead>
                  <TableHead>공급자</TableHead>
                  <TableHead className="text-right">금액</TableHead>
                  <TableHead className="text-right">VAT</TableHead>
                  <TableHead className="text-right">합계</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>세금계산서</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs">
                      <Badge variant="outline">{EXPENSE_CATEGORY_LABEL_KO[e.category]}</Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium">{e.description}</TableCell>
                    <TableCell className="text-xs text-[var(--muted-foreground)]">
                      {e.vendor_name ?? "-"}
                      {e.vendor_biz_no ? <span className="block text-[10px]">{e.vendor_biz_no}</span> : null}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums">
                      {e.amount_krw.toLocaleString("ko-KR")}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums">
                      {e.vat_krw.toLocaleString("ko-KR")}
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold tabular-nums">
                      {e.total_krw.toLocaleString("ko-KR")}
                    </TableCell>
                    <TableCell>
                      <select
                        aria-label="상태"
                        value={e.status}
                        onChange={(ev) => onStatusChange(e, ev.target.value as ExpenseStatus)}
                        disabled={pending}
                        className="h-7 rounded-md border border-[var(--border)] bg-[var(--background)] px-2 text-xs"
                      >
                        {EXPENSE_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {EXPENSE_STATUS_LABEL_KO[s]}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell className="text-xs text-[var(--muted-foreground)]">
                      {e.invoice_number ? (
                        <>
                          <span className="font-mono">{e.invoice_number}</span>
                          {e.invoice_issued_at ? <span className="block text-[10px]">{e.invoice_issued_at}</span> : null}
                        </>
                      ) : (
                        <span className="text-[var(--muted-foreground)]">미발급</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button variant="outline" size="sm" onClick={() => openEdit(e)} disabled={pending}>
                          수정
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => onDelete(e.id)} disabled={pending}>
                          삭제
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Add / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "비용 수정" : "비용 추가"}</DialogTitle>
            <DialogDescription>
              부가세 별도 금액 + 부가세 (10%) 분리 입력. 세금계산서 발급 받았으면 invoice_number 입력 (부가세 환급 인정 조건).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="category">카테고리</Label>
                <select
                  id="category"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}
                  className="mt-1 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 text-sm"
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{EXPENSE_CATEGORY_LABEL_KO[c]}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="status">상태</Label>
                <select
                  id="status"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as ExpenseStatus })}
                  className="mt-1 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 text-sm"
                >
                  {EXPENSE_STATUSES.map((s) => (
                    <option key={s} value={s}>{EXPENSE_STATUS_LABEL_KO[s]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">설명</Label>
              <Input
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
                maxLength={500}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="amount_krw">금액 (부가세 별도)</Label>
                <Input
                  id="amount_krw"
                  type="number"
                  min={0}
                  value={form.amount_krw}
                  onChange={(e) => setForm({ ...form, amount_krw: Number(e.target.value) || 0 })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="vat_krw">부가세 (10%)</Label>
                <Input
                  id="vat_krw"
                  type="number"
                  min={0}
                  value={form.vat_krw}
                  onChange={(e) => setForm({ ...form, vat_krw: Number(e.target.value) || 0 })}
                />
                <button
                  type="button"
                  className="mt-1 text-[11px] text-[var(--primary)] underline"
                  onClick={() => setForm({ ...form, vat_krw: Math.round(form.amount_krw * 0.1) })}
                >
                  amount × 10% 자동 계산
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="vendor_name">공급자 (회사명)</Label>
                <Input
                  id="vendor_name"
                  value={form.vendor_name}
                  onChange={(e) => setForm({ ...form, vendor_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="vendor_biz_no">사업자번호</Label>
                <Input
                  id="vendor_biz_no"
                  value={form.vendor_biz_no}
                  onChange={(e) => setForm({ ...form, vendor_biz_no: e.target.value })}
                  placeholder="000-00-00000"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="invoice_number">세금계산서 번호</Label>
                <Input
                  id="invoice_number"
                  value={form.invoice_number}
                  onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="invoice_issued_at">발급일</Label>
                <Input
                  id="invoice_issued_at"
                  type="date"
                  value={form.invoice_issued_at}
                  onChange={(e) => setForm({ ...form, invoice_issued_at: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="paid_at">지급일</Label>
                <Input
                  id="paid_at"
                  type="date"
                  value={form.paid_at}
                  onChange={(e) => setForm({ ...form, paid_at: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="paid_via">지급 수단</Label>
                <Input
                  id="paid_via"
                  value={form.paid_via}
                  onChange={(e) => setForm({ ...form, paid_via: e.target.value })}
                  placeholder="토스뱅크 / 카드 / 현금"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="receipt_url">영수증 / 세금계산서 URL</Label>
              <Input
                id="receipt_url"
                type="url"
                value={form.receipt_url}
                onChange={(e) => setForm({ ...form, receipt_url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div>
              <Label htmlFor="notes">메모</Label>
              <Textarea
                id="notes"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                취소
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "저장 중..." : editingId ? "저장" : "추가"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ────────────────────── Section 3. Tax Filings ────────────────────── */

function FilingsSection({ filings }: { filings: TaxFiling[] }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const upcoming = filings.filter((f) => isUpcoming(f));
  const overdue = filings.filter((f) => isOverdue(f));

  function onStatusChange(filing: TaxFiling, status: FilingStatus) {
    startTransition(async () => {
      const result = await updateFilingAction({ id: filing.id, status });
      if (result.status === "error") {
        alert(`상태 변경 실패: ${result.error}`);
        return;
      }
      router.refresh();
    });
  }

  function onReferenceChange(filing: TaxFiling, reference_no: string) {
    startTransition(async () => {
      await updateFilingAction({ id: filing.id, reference_no: reference_no || null });
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">세무 신고 일정 ({filings.length}건)</CardTitle>
        <CardDescription>
          노아 = 일반 과세 사업자 (Dropdown, 154-28-02110), 학원 미등록. 홈택스 (hometax.go.kr) 또는 세무사 위탁 신고.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-0">
        {overdue.length > 0 ? (
          <Alert variant="destructive" className="mx-6">
            <AlertTitle>지난 일정 {overdue.length}건</AlertTitle>
            <AlertDescription>
              {overdue.map((f) => FILING_TYPE_LABEL_KO[f.filing_type]).join(", ")} - 즉시 신고 필요.
            </AlertDescription>
          </Alert>
        ) : null}
        {upcoming.length > 0 ? (
          <Alert className="mx-6">
            <AlertTitle>30일 이내 일정 {upcoming.length}건</AlertTitle>
            <AlertDescription>
              {upcoming.map((f) => `${FILING_TYPE_LABEL_KO[f.filing_type]} (D-${daysUntilDue(f.due_date)})`).join(", ")}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>신고 유형</TableHead>
                <TableHead>대상 기간</TableHead>
                <TableHead>마감일</TableHead>
                <TableHead>D-day</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>홈택스 신고번호</TableHead>
                <TableHead>비고</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filings.map((f) => {
                const days = daysUntilDue(f.due_date);
                const isClosed = f.status === "filed" || f.status === "paid" || f.status === "not_applicable";
                const overdueRow = isOverdue(f);
                return (
                  <TableRow key={f.id}>
                    <TableCell className="text-sm font-medium">
                      {FILING_TYPE_LABEL_KO[f.filing_type]}
                    </TableCell>
                    <TableCell className="text-xs text-[var(--muted-foreground)]">
                      {f.period_start} ~ {f.period_end}
                    </TableCell>
                    <TableCell className="text-xs tabular-nums">
                      {f.due_date}
                    </TableCell>
                    <TableCell>
                      {isClosed ? (
                        <Badge variant="secondary">완료</Badge>
                      ) : overdueRow ? (
                        <Badge variant="destructive">D+{Math.abs(days)}</Badge>
                      ) : days <= 30 ? (
                        <Badge variant="warning">D-{days}</Badge>
                      ) : (
                        <span className="text-xs text-[var(--muted-foreground)]">D-{days}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <select
                        aria-label="상태"
                        value={f.status}
                        onChange={(ev) => onStatusChange(f, ev.target.value as FilingStatus)}
                        disabled={pending}
                        className="h-7 rounded-md border border-[var(--border)] bg-[var(--background)] px-2 text-xs"
                      >
                        {FILING_STATUSES.map((s) => (
                          <option key={s} value={s}>{FILING_STATUS_LABEL_KO[s]}</option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      <input
                        type="text"
                        defaultValue={f.reference_no ?? ""}
                        onBlur={(ev) => {
                          const v = ev.target.value.trim();
                          if (v !== (f.reference_no ?? "")) onReferenceChange(f, v);
                        }}
                        placeholder="-"
                        disabled={pending}
                        className="h-7 w-32 rounded-md border border-[var(--border)] bg-[var(--background)] px-2 text-xs font-mono"
                      />
                    </TableCell>
                    <TableCell className="text-xs text-[var(--muted-foreground)] max-w-xs">
                      {f.notes ?? "-"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ────────────────────── Section 4. Accounting Guide ────────────────────── */

function AccountingGuide() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">회계 / 세무 가이드</CardTitle>
        <CardDescription>
          일반 과세 사업자 (학원 미등록) 기준. 1기 운영 동안의 회계 / 세무 핵심 룰 모음.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <GuideItem title="1. 사업 형태 (현재)">
          <ul className="space-y-1 list-disc pl-5">
            <li>법인: <strong>Dropdown (드롭다운)</strong> / 사업자번호 154-28-02110</li>
            <li>과세 유형: <strong>일반 과세 사업자</strong> (간이 X)</li>
            <li>학원: <strong>미등록</strong> (학원법 §2 학원 정의 미해당 - 1회성 단기 부트캠프, 4주 8회)</li>
            <li>업종 추정: 교육 서비스업 또는 정보 서비스업 (정확한 업종 코드는 세무사 자문 권장)</li>
          </ul>
        </GuideItem>

        <GuideItem title="2. 매출 회계 처리">
          <ul className="space-y-1 list-disc pl-5">
            <li>1인당 수강료 880,000원은 <strong>부가세 포함</strong> 표시 가격</li>
            <li>공급가액 (VAT 별도) = 880,000 / 1.1 = 800,000원</li>
            <li>매출세액 = 880,000 - 800,000 = 80,000원 (1인당)</li>
            <li>친구 추천 할인 시 830,000원 = 공급가액 754,545 + VAT 75,455</li>
            <li>현금 매출 → 영세사업자 현금영수증 자율 발행 (의무사업자 아님, 단 요청 시 발급)</li>
          </ul>
        </GuideItem>

        <GuideItem title="3. 비용 (매입) 회계 분류">
          <ul className="space-y-1 list-disc pl-5">
            <li><strong>강사료 (외주비)</strong>: 강사 회사가 세금계산서 발행 시 매입세액 환급. 개인 강사면 사업소득 원천징수 3.3% (사업자등록증 없는 경우)</li>
            <li><strong>임차료 (강의장)</strong>: 영수증 / 세금계산서 보관 의무</li>
            <li><strong>회의비 / 행사비</strong>: 1건 30,000원 초과 시 적격증빙 (세금계산서 / 현금영수증 / 카드매출전표) 필수</li>
            <li><strong>영업판촉비 (광고)</strong>: Google / Naver / Facebook 광고비도 세금계산서 발행 가능 (계정 설정에서 사업자등록증 등록)</li>
            <li><strong>친구 추천 보상</strong> (50,000원 / 1인): 소득세법 §84 4호 비과세 (한 사람당 연 200,000원 한도) - 원천징수 X, 비용은 영업판촉비</li>
          </ul>
        </GuideItem>

        <GuideItem title="4. 세금계산서 발급 받기 (핵심)">
          <ul className="space-y-1 list-disc pl-5">
            <li>매입세액 환급 (부가세 절감) 의 핵심 = 세금계산서 발급 받기</li>
            <li>모든 비용 거래 시 공급자에게 <strong>전자세금계산서 발행</strong> 요청 (Dropdown 사업자번호 154-28-02110 제출)</li>
            <li>강사 회사: 회사 사업자번호로 세금계산서 발행 받음</li>
            <li>강의장: 임대인이 세금계산서 발행 가능한지 사전 확인 (개인 임대는 종종 X)</li>
            <li>광고 / SaaS: 계정 결제 설정에서 사업자등록증 등록 → 매월 자동 발행</li>
            <li>30,000원 미만 소액은 영수증으로 OK</li>
          </ul>
        </GuideItem>

        <GuideItem title="5. 영수증 / 증빙 보관">
          <ul className="space-y-1 list-disc pl-5">
            <li>세금계산서: 홈택스 (hometax.go.kr) 에서 자동 보관 (5년)</li>
            <li>카드매출전표: 카드사 매출전표 또는 PDF (5년)</li>
            <li>현금영수증: 받는 즉시 사진 / 스캔 (5년)</li>
            <li>본 dashboard 의 비용 entry receipt_url 에 Drive / Notion / Google Photos 링크 첨부 권장</li>
          </ul>
        </GuideItem>

        <GuideItem title="6. 부가세 신고 (분기)">
          <ul className="space-y-1 list-disc pl-5">
            <li><strong>1기 (1-6월) 신고 / 납부:</strong> 7월 25일 까지</li>
            <li><strong>2기 (7-12월) 신고 / 납부:</strong> 익년 1월 25일 까지</li>
            <li>1기 강좌 매출은 6/27 ~ 6/30 (4일) + 7/1 ~ 7/19 (19일) 양 분기 걸쳐 분할</li>
            <li>실 매출 인식 시점 = 입금일 (paid_at) 이 어느 분기인지 기준</li>
            <li>신고 = 매출세액 - 매입세액 차액 납부 (음수면 환급)</li>
            <li>홈택스 → 신고 / 납부 → 부가가치세 → 일반과세자 신고</li>
          </ul>
        </GuideItem>

        <GuideItem title="7. 종합소득세 신고 (5월)">
          <ul className="space-y-1 list-disc pl-5">
            <li>매년 5월 1일 ~ 5월 31일 신고 / 납부 (2026년 실적은 2027년 5월)</li>
            <li>법인 Dropdown 의 경우 <strong>법인세</strong> 신고 (사업연도 종료 3개월 후, 보통 3월 31일)</li>
            <li>※ 사업자가 법인 (Dropdown) 이면 종합소득세 X, 법인세 O - 세무사 자문 필수</li>
            <li>매출 - 비용 - 기본공제 = 과세표준 → 누진세율 (법인은 9% / 19% / 21%, 개인은 6% ~ 45%)</li>
          </ul>
        </GuideItem>

        <GuideItem title="8. 원천징수 지급명세서 (강사료)">
          <ul className="space-y-1 list-disc pl-5">
            <li>강사가 <strong>개인 사업자</strong> 또는 <strong>프리랜서</strong> (사업소득) 면 3.3% 원천징수 후 지급</li>
            <li>강사가 <strong>회사 소속 직원 파견 / 회사가 세금계산서 발행</strong> 시 원천징수 X (외주비)</li>
            <li>원천징수 시 다음달 10일까지 원천징수이행상황신고서 + 익년 3월 10일까지 지급명세서</li>
            <li>현재 본 dashboard 시드: <em>강사 회사가 세금계산서 발행 가정</em> - withholding_report 는 not_applicable 로 변경 가능</li>
          </ul>
        </GuideItem>

        <GuideItem title="9. 회계 SaaS 추천 (선택)">
          <ul className="space-y-1 list-disc pl-5">
            <li><strong>자비스 (jobis.co)</strong>: 영세 자영업자 / 1인 법인 인기. 월 19,800원 ~. 세무사 매칭 옵션.</li>
            <li><strong>더존 Bizon</strong>: 중소기업 표준. 부가세 / 법인세 신고 강력하지만 학습 곡선.</li>
            <li><strong>홈택스 직접</strong>: 1기 운영 정도 매출 / 비용 규모면 직접 신고 가능. 부가세는 셀프, 법인세는 세무사 위탁 권장.</li>
            <li><strong>세무사 위탁</strong>: 월 11만원 ~ (사업 규모 / 거래 건수 기반). 1기 1회성이면 단건 신고 의뢰 (회당 30만원 ~) 도 가능.</li>
          </ul>
        </GuideItem>

        <GuideItem title="10. 단계별 권장 액션 (1기 종료 후)">
          <ul className="space-y-1 list-disc pl-5">
            <li>7월 19일 종강 → 모든 매출 / 비용 paid 처리 + 영수증 첨부</li>
            <li>7월 25일 → 부가세 1기 신고 (4일분 매출만)</li>
            <li>7월 ~ 8월 → 비용 세금계산서 전부 받았는지 점검 (특히 강사료 / 강의장)</li>
            <li>2027년 1월 25일 → 부가세 2기 신고 (잔여 19일분 매출 + 수료식)</li>
            <li>2027년 3월 → 법인세 (사업연도가 12월 결산이면) 또는 종합소득세 준비 시작</li>
          </ul>
        </GuideItem>
      </CardContent>
    </Card>
  );
}

function GuideItem({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="rounded-md border border-[var(--border)] bg-[var(--card)]"
    >
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--muted)]">
        {title}
      </summary>
      <div className="border-t border-[var(--border)] px-4 py-3 text-xs text-[var(--muted-foreground)] leading-relaxed">
        {children}
      </div>
    </details>
  );
}
