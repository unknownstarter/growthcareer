/**
 * Ticket repository — 2026-07-10.
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import {
  TicketSchema,
  type Ticket,
  type TicketStatus,
} from "@/src/programs/fan-to-pro/domain/entities/ticket";

const TABLE = "tickets";

function requireClient() {
  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("supabaseUnavailable");
  return supabase;
}

export async function fetchAllTickets(): Promise<Ticket[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("phase", { ascending: true })
    .order("priority", { ascending: true })
    .order("ticket_no", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => TicketSchema.parse(row));
}

export async function fetchTicketById(id: string): Promise<Ticket | null> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return TicketSchema.parse(data);
}

export async function updateTicketStatus(
  id: string,
  status: TicketStatus,
): Promise<void> {
  const supabase = requireClient();
  const { error } = await supabase
    .from(TABLE)
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
