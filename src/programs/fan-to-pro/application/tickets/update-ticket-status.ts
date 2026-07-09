"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { assertSuperAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { updateTicketStatus } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/ticket-repository";
import { TicketStatusSchema } from "@/src/programs/fan-to-pro/domain/entities/ticket";

const InputSchema = z.object({
  id: z.string().uuid(),
  status: TicketStatusSchema,
});

export type UpdateTicketStatusResult =
  | { status: "ok" }
  | { status: "error"; error: string };

export async function updateTicketStatusAction(
  input: unknown,
): Promise<UpdateTicketStatusResult> {
  await assertSuperAdmin();
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", error: "invalidInput" };
  }
  try {
    await updateTicketStatus(parsed.data.id, parsed.data.status);
    revalidatePath("/[locale]/fan-to-pro/admin/tickets", "page");
    return { status: "ok" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return { status: "error", error: msg };
  }
}
