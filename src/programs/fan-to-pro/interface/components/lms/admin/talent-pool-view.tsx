"use client";

/**
 * Talent Pool — 모든 기수의 applicants 통합 view.
 *
 * 핵심 가치:
 *   - 같은 이메일이 여러 기수에 신청한 경우 = 강한 의향. 다음 기수 우선 outreach.
 *   - notified / cancelled 이전 기수 applicants = 다음 기수 우선 outreach 대상.
 *
 * Wave 1 hotfix 범위: 단순 list. 동일인 merge / 자동 outreach 는 Wave 4.
 */
import * as React from "react";
import type { Route } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/card";
import { Badge } from "@/src/programs/fan-to-pro/interface/components/lms/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/table";
import type {
  ApplicantRow,
  ApplicantStatus,
} from "@/src/programs/fan-to-pro/application/dto/applicant-row";
import { STATUS_LABEL_KO } from "@/src/programs/fan-to-pro/application/dto/applicant-row";

type CohortSummary = { id: string; name: string; slug: string | null };

type Props = {
  applicants: ApplicantRow[];
  cohorts: CohortSummary[];
  locale: string;
};

// 라벨은 canonical 단일 소스 (application/dto/applicant-row).
const STATUS_LABEL = STATUS_LABEL_KO;

export function TalentPoolView({ applicants, cohorts, locale }: Props) {
  const [cohortFilter, setCohortFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [query, setQuery] = React.useState("");

  // 이메일 별 신청 횟수 — 다회 신청자 (강한 의향) 식별.
  const emailCount = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const a of applicants) {
      const key = a.email.toLowerCase();
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [applicants]);

  const cohortMap = React.useMemo(() => {
    const m = new Map<string, CohortSummary>();
    for (const c of cohorts) m.set(c.id, c);
    return m;
  }, [cohorts]);

  const filtered = React.useMemo(() => {
    let rows = applicants;
    if (cohortFilter !== "all") {
      if (cohortFilter === "none") {
        rows = rows.filter((r) => !r.cohortId);
      } else {
        rows = rows.filter((r) => r.cohortId === cohortFilter);
      }
    }
    if (statusFilter !== "all") {
      rows = rows.filter((r) => r.status === statusFilter);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) =>
        [r.name, r.email, r.phone, r.nationality ?? ""]
          .some((f) => f.toLowerCase().includes(q)),
      );
    }
    return rows;
  }, [applicants, cohortFilter, statusFilter, query]);

  // 다음 기수 outreach 후보 (notified/cancelled — 안내 받았지만 입금 안 한 + 취소)
  const outreachCandidates = applicants.filter(
    (a) => a.status === "notified" || a.status === "cancelled",
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">다음 기수 outreach 후보</CardTitle>
          <CardDescription>
            상태가 안내 / 취소인 신청자. 다음 기수 모집 시 우선 컨택 대상.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric
              label="안내 받았지만 미입금"
              value={
                applicants.filter((a) => a.status === "notified").length
              }
            />
            <Metric
              label="취소"
              value={applicants.filter((a) => a.status === "cancelled").length}
            />
            <Metric
              label="다회 신청자"
              value={
                Array.from(emailCount.values()).filter((v) => v >= 2).length
              }
            />
            <Metric
              label="전체 인재풀"
              value={applicants.length}
            />
          </div>
          <p className="mt-3 text-xs text-[var(--muted-foreground)]">
            현재 후보 {outreachCandidates.length}명. 다음 기수 cohort 생성 후
            메시지 발송 기능은 Wave 4.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between space-y-0">
          <div>
            <CardTitle className="text-base">
              신청자 ({filtered.length}/{applicants.length}명)
            </CardTitle>
            <CardDescription>기수 / 상태 / 키워드로 좁히기.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="기수"
              value={cohortFilter}
              onChange={(e) => setCohortFilter(e.target.value)}
              className="h-9 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            >
              <option value="all">전체 기수</option>
              {cohorts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              <option value="none">미지정</option>
            </select>
            <select
              aria-label="상태"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            >
              <option value="all">전체 상태</option>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <input
              type="search"
              aria-label="검색"
              placeholder="이름 / 이메일 / 전화"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)] sm:w-60"
            />
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {filtered.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-[var(--muted-foreground)]">
              조건에 맞는 신청자가 없습니다.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>이름</TableHead>
                    <TableHead>이메일</TableHead>
                    <TableHead>전화</TableHead>
                    <TableHead>국적</TableHead>
                    <TableHead>기수</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>신청일</TableHead>
                    <TableHead>재신청</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => {
                    const cohort = r.cohortId
                      ? cohortMap.get(r.cohortId)
                      : null;
                    const count = emailCount.get(r.email.toLowerCase()) ?? 1;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-semibold text-[var(--foreground)]">
                          <Link
                            href={
                              `/${locale}/fan-to-pro/admin/applicants/${r.id}` as Route
                            }
                            className="hover:text-[var(--primary)] hover:underline underline-offset-2"
                          >
                            {r.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-xs text-[var(--muted-foreground)]">
                          {r.email}
                        </TableCell>
                        <TableCell className="text-xs text-[var(--muted-foreground)]">
                          {r.phone}
                        </TableCell>
                        <TableCell className="text-xs">
                          {r.nationality ?? "-"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {cohort?.name ?? "-"}
                        </TableCell>
                        <TableCell>
                          <ApplicantStatusBadge status={r.status} />
                        </TableCell>
                        <TableCell className="text-xs tabular-nums text-[var(--muted-foreground)]">
                          {fmtDate(r.createdAt)}
                        </TableCell>
                        <TableCell>
                          {count >= 2 ? (
                            <Badge variant="warning">{count}회</Badge>
                          ) : (
                            <span className="text-xs text-[var(--muted-foreground)]">
                              1회
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ApplicantStatusBadge({ status }: { status: ApplicantStatus }) {
  const map: Record<
    ApplicantStatus,
    {
      variant:
        | "default"
        | "secondary"
        | "outline"
        | "success"
        | "warning"
        | "destructive";
    }
  > = {
    pending: { variant: "outline" },
    notified: { variant: "warning" },
    paid: { variant: "success" },
    overdue: { variant: "destructive" },
    cancelled: { variant: "secondary" },
    enrolled: { variant: "success" },
    refunded: { variant: "secondary" },
    next_cohort_interest: { variant: "default" },
  };
  const cfg = map[status];
  return <Badge variant={cfg.variant}>{STATUS_LABEL_KO[status]}</Badge>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--card)] px-4 py-3">
      <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}
