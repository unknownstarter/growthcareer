import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { ChevronRight } from "lucide-react";
import { assertSuperAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { fetchAllTickets } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/ticket-repository";
import {
  PHASE_LABELS,
  STATUS_LABELS,
  type Ticket,
} from "@/src/programs/fan-to-pro/domain/entities/ticket";

export const metadata: Metadata = {
  title: "할일 - Fan to Pro",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function TicketsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await assertSuperAdmin();
  const { locale } = await params;
  const tickets = await fetchAllTickets();

  const byPhase: Record<number, Ticket[]> = { 1: [], 2: [], 3: [], 4: [] };
  for (const t of tickets) byPhase[t.phase]?.push(t);

  const totalOpen = tickets.filter(
    (t) => t.status === "backlog" || t.status === "in_progress",
  ).length;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 md:px-10 md:py-10 space-y-8 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-500">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">할일</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          2기 launch + 1기 수료식 준비. 미완료 {totalOpen}개.
        </p>
      </header>

      {[1, 2, 3, 4].map((phase, phaseIdx) => {
        const items = byPhase[phase] ?? [];
        if (items.length === 0) return null;
        return (
          <section
            key={phase}
            className="space-y-3 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500"
            style={{ animationDelay: `${phaseIdx * 80}ms` }}
          >
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              Phase {phase}. {PHASE_LABELS[phase]}
            </h2>
            <div className="border border-[var(--border)] rounded-[var(--radius)] bg-[var(--card)] divide-y divide-[var(--border)] overflow-hidden">
              {items.map((t, i) => (
                <Link
                  key={t.id}
                  href={`/${locale}/fan-to-pro/admin/tickets/${t.id}` as Route}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-[var(--secondary)] transition-colors duration-150 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-left-2 motion-safe:duration-300"
                  style={{ animationDelay: `${phaseIdx * 80 + i * 30}ms` }}
                >
                  <PriorityBadge priority={t.priority} />
                  <span className="font-mono text-xs text-[var(--muted-foreground)] min-w-[52px]">
                    {t.ticket_no}
                  </span>
                  <span className="flex-1 text-sm font-medium text-[var(--foreground)]">
                    {t.title}
                  </span>
                  {t.owner ? (
                    <span className="text-xs text-[var(--muted-foreground)] hidden sm:inline">
                      {t.owner}
                    </span>
                  ) : null}
                  {t.due_date ? (
                    <span className="text-xs text-[var(--muted-foreground)] hidden md:inline">
                      {t.due_date}
                    </span>
                  ) : null}
                  <StatusBadge status={t.status} />
                  <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)] transition-transform duration-150 group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: "P0" | "P1" | "P2" }) {
  const map = {
    P0: "bg-red-100 text-red-800 border-red-200",
    P1: "bg-amber-100 text-amber-800 border-amber-200",
    P2: "bg-slate-100 text-slate-700 border-slate-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${map[priority]}`}
    >
      {priority}
    </span>
  );
}

function StatusBadge({ status }: { status: Ticket["status"] }) {
  const map = {
    backlog: "bg-slate-100 text-slate-700 border-slate-200",
    in_progress: "bg-blue-100 text-blue-800 border-blue-200",
    done: "bg-emerald-100 text-emerald-800 border-emerald-200",
    blocked: "bg-red-100 text-red-800 border-red-200",
    deferred: "bg-slate-100 text-slate-500 border-slate-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${map[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
