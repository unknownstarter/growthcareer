/**
 * Ticket entity — 2026-07-10.
 * LMS 내부 티켓 (2기 launch + 1기 수료식 준비). super_admin only.
 */
import { z } from "zod";

export const TICKET_STATUSES = [
  "backlog",
  "in_progress",
  "done",
  "blocked",
  "deferred",
] as const;
export const TicketStatusSchema = z.enum(TICKET_STATUSES);
export type TicketStatus = z.infer<typeof TicketStatusSchema>;

export const TICKET_PRIORITIES = ["P0", "P1", "P2"] as const;
export const TicketPrioritySchema = z.enum(TICKET_PRIORITIES);
export type TicketPriority = z.infer<typeof TicketPrioritySchema>;

export const TicketSchema = z.object({
  id: z.string().uuid(),
  phase: z.number().int().min(1).max(4),
  ticket_no: z.string().min(1),
  title: z.string().min(1),
  body_md: z.string().nullable(),
  status: TicketStatusSchema,
  priority: TicketPrioritySchema,
  owner: z.string().nullable(),
  due_date: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Ticket = z.infer<typeof TicketSchema>;

/** Phase 별 라벨 (UI 표시용). */
export const PHASE_LABELS: Record<number, string> = {
  1: "2기 모집 시작 준비",
  2: "1기 수료증 오피셜화",
  3: "수료식 & 네트워킹 파티",
  4: "종강 후 (Outcomes + 2기 강화)",
};

export const STATUS_LABELS: Record<TicketStatus, string> = {
  backlog: "대기",
  in_progress: "진행 중",
  done: "완료",
  blocked: "블로킹",
  deferred: "보류",
};
