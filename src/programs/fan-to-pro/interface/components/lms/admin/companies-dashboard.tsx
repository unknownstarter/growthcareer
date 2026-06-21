"use client";

/**
 * /lms/admin/companies — 회사 list + 등록/수정.
 *
 * Wave 3 정산 전에 회사 정보 (사업자번호 / 계좌 / VAT 여부) 모두 채워야 함.
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/card";
import { Button } from "@/src/programs/fan-to-pro/interface/components/lms/ui/button";
import { Badge } from "@/src/programs/fan-to-pro/interface/components/lms/ui/badge";
import { Input } from "@/src/programs/fan-to-pro/interface/components/lms/ui/input";
import { Label } from "@/src/programs/fan-to-pro/interface/components/lms/ui/label";
import { Textarea } from "@/src/programs/fan-to-pro/interface/components/lms/ui/textarea";
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
  DialogTrigger,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/dialog";
import {
  createCompanyAction,
  updateCompanyAction,
} from "@/src/programs/fan-to-pro/interface/server-actions/admin/lms-company-actions";
import type { Company } from "@/src/programs/fan-to-pro/domain/entities/company";

type Props = { companies: Company[] };

export function CompaniesDashboard({ companies }: Props) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Company | null>(null);
  const [feedback, setFeedback] = React.useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }
  function openEdit(c: Company) {
    setEditing(c);
    setOpen(true);
  }

  async function onSubmit(formData: FormData) {
    const payload = Object.fromEntries(formData.entries()) as Record<string, string>;
    const data = {
      name: payload.name?.trim() ?? "",
      biz_no: payload.biz_no?.trim() || null,
      address: payload.address?.trim() || null,
      contact_name: payload.contact_name?.trim() || null,
      contact_email: payload.contact_email?.trim() || null,
      bank_name: payload.bank_name?.trim() || null,
      bank_account: payload.bank_account?.trim() || null,
      bank_holder: payload.bank_holder?.trim() || null,
      vat_issuer: payload.vat_issuer === "on",
      notes: payload.notes?.trim() || null,
    };

    startTransition(async () => {
      const result = editing
        ? await updateCompanyAction({ id: editing.id, ...data })
        : await createCompanyAction(data);
      if (result.status === "error") {
        setFeedback(`오류: ${result.error}`);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <CardTitle>회사 ({companies.length}개)</CardTitle>
            <CardDescription>
              강사 정산 단위. Wave 3 정산 전 사업자번호 + 계좌 + VAT 여부 필수.
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="h-12 px-6" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                회사 추가
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editing ? "회사 수정" : "회사 추가"}
                </DialogTitle>
                <DialogDescription>
                  계좌 + 사업자번호는 회사 정산 메일 발송 시 사용됩니다.
                </DialogDescription>
              </DialogHeader>
              <form action={onSubmit} className="space-y-4">
                <Field
                  label="회사명 *"
                  name="name"
                  required
                  defaultValue={editing?.name ?? ""}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="사업자번호"
                    name="biz_no"
                    placeholder="000-00-00000"
                    defaultValue={editing?.biz_no ?? ""}
                  />
                  <Field
                    label="담당자"
                    name="contact_name"
                    defaultValue={editing?.contact_name ?? ""}
                  />
                </div>
                <Field
                  label="담당자 이메일"
                  name="contact_email"
                  type="email"
                  defaultValue={editing?.contact_email ?? ""}
                />
                <Field
                  label="주소"
                  name="address"
                  defaultValue={editing?.address ?? ""}
                />
                <div className="grid grid-cols-3 gap-3">
                  <Field
                    label="은행"
                    name="bank_name"
                    defaultValue={editing?.bank_name ?? ""}
                  />
                  <Field
                    label="계좌"
                    name="bank_account"
                    defaultValue={editing?.bank_account ?? ""}
                  />
                  <Field
                    label="예금주"
                    name="bank_holder"
                    defaultValue={editing?.bank_holder ?? ""}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="vat_issuer"
                    name="vat_issuer"
                    type="checkbox"
                    defaultChecked={editing?.vat_issuer ?? false}
                    className="h-4 w-4 rounded border-[var(--border)]"
                  />
                  <Label htmlFor="vat_issuer" className="text-sm font-normal">
                    세금계산서 발행 (부가세 10% 가산)
                  </Label>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="notes" className="text-xs">메모</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    rows={2}
                    defaultValue={editing?.notes ?? ""}
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                    disabled={pending}
                  >
                    취소
                  </Button>
                  <Button type="submit" disabled={pending}>
                    {pending ? "저장 중..." : editing ? "수정" : "추가"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {feedback ? (
          <div className="mb-4 rounded-[var(--radius-sm)] bg-[var(--secondary)] px-4 py-3 text-sm">
            {feedback}
          </div>
        ) : null}
        {companies.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
            등록된 회사가 없습니다. [회사 추가] 버튼으로 시작하세요.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>회사명</TableHead>
                <TableHead>사업자번호</TableHead>
                <TableHead>담당자</TableHead>
                <TableHead>계좌</TableHead>
                <TableHead>세무</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-semibold">{c.name}</TableCell>
                  <TableCell className="text-[var(--muted-foreground)]">
                    {c.biz_no ?? "-"}
                  </TableCell>
                  <TableCell className="text-[var(--muted-foreground)]">
                    {c.contact_name ?? "-"}
                    {c.contact_email ? ` (${c.contact_email})` : ""}
                  </TableCell>
                  <TableCell className="text-xs text-[var(--muted-foreground)]">
                    {c.bank_name && c.bank_account
                      ? `${c.bank_name} ${c.bank_account}`
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {c.vat_issuer ? (
                      <Badge>세금계산서</Badge>
                    ) : (
                      <Badge variant="outline">원천징수</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(c)}
                    >
                      수정
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | null;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={name} className="text-xs">
        {label}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue ?? ""}
      />
    </div>
  );
}
