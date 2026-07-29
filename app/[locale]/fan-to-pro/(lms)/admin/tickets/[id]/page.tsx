import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { assertSuperAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { fetchTicketById } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/ticket-repository";
import {
  PHASE_LABELS,
  STATUS_LABELS,
  TICKET_STATUSES,
  type Ticket,
} from "@/src/programs/fan-to-pro/domain/entities/ticket";
import { updateTicketStatusAction } from "@/src/programs/fan-to-pro/application/tickets/update-ticket-status";
import { Button } from "@/src/programs/fan-to-pro/interface/components/lms/ui/button";

export const metadata: Metadata = {
  title: "할일 상세 - Fan to Pro",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  await assertSuperAdmin();
  const { locale, id } = await params;
  const ticket = await fetchTicketById(id);
  if (!ticket) notFound();

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 md:px-10 md:py-10 space-y-6">
      <Link
        href={`/${locale}/fan-to-pro/admin/tickets` as Route}
        className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="h-4 w-4" />
        할일 목록
      </Link>

      <header className="space-y-2">
        <p className="text-xs font-mono text-[var(--muted-foreground)]">
          {ticket.ticket_no} / Phase {ticket.phase}. {PHASE_LABELS[ticket.phase]}
        </p>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          {ticket.title}
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted-foreground)]">
          <span>우선순위 {ticket.priority}</span>
          {ticket.owner ? <span>· 담당 {ticket.owner}</span> : null}
          {ticket.due_date ? <span>· 마감 {ticket.due_date}</span> : null}
        </div>
      </header>

      <StatusSection ticket={ticket} />

      {ticket.body_md ? (
        <details className="border border-[var(--border)] rounded-[var(--radius)] bg-[var(--card)] p-4">
          <summary className="cursor-pointer text-sm font-semibold text-[var(--foreground)]">
            참고 정보 (참고할 것 / 만드는 방법 / 어딜 찾을지)
          </summary>
          <div className="mt-4 whitespace-pre-wrap text-sm text-[var(--foreground)]">
            {ticket.body_md}
          </div>
        </details>
      ) : (
        <div className="text-sm text-[var(--muted-foreground)] italic">
          참고 정보 없음.
        </div>
      )}

      <div className="text-xs text-[var(--muted-foreground)]">
        최종 갱신 {new Date(ticket.updated_at).toLocaleString("ko-KR")}
      </div>
    </div>
  );
}

function StatusSection({ ticket }: { ticket: Ticket }) {
  async function handleUpdate(formData: FormData) {
    "use server";
    const status = String(formData.get("status") ?? "");
    await updateTicketStatusAction({ id: ticket.id, status });
  }

  return (
    <form action={handleUpdate} className="flex items-center gap-3">
      <label
        htmlFor="status"
        className="text-sm font-medium text-[var(--foreground)]"
      >
        상태
      </label>
      <select
        id="status"
        name="status"
        defaultValue={ticket.status}
        className="rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm text-[var(--foreground)]"
      >
        {TICKET_STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>
      <Button type="submit" size="sm">
        갱신
      </Button>
    </form>
  );
}
