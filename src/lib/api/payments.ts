import { supabase, unwrap } from "./client";
import type { Database } from "@/integrations/supabase/types";

export type Payment = Database["public"]["Tables"]["payments"]["Row"];
export type PaymentMethod = Database["public"]["Enums"]["payment_method"];

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
  otro: "Otro",
};

export async function listPayments(schoolId: string): Promise<Payment[]> {
  return (
    unwrap(
      await supabase
        .from("payments")
        .select("*")
        .eq("school_id", schoolId)
        .order("due_date", { ascending: false }),
    ) ?? []
  );
}

export interface ChargeInput {
  player_id: string;
  concept: string;
  period: string | null;
  amount: number;
  due_date: string;
  note?: string | null;
}

export async function createCharges(schoolId: string, rows: ChargeInput[]) {
  if (rows.length === 0) return 0;
  const { data, error } = await supabase
    .from("payments")
    .upsert(
      rows.map((r) => ({ ...r, school_id: schoolId })),
      { onConflict: "player_id,period,concept", ignoreDuplicates: true },
    )
    .select("id");
  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}

export async function markPaid(id: string, paid_at: string, method: PaymentMethod) {
  unwrap(await supabase.from("payments").update({ paid_at, method }).eq("id", id).select().single());
}

export async function markUnpaid(id: string) {
  unwrap(
    await supabase.from("payments").update({ paid_at: null, method: null }).eq("id", id).select().single(),
  );
}

export async function removePayment(id: string) {
  const { error } = await supabase.from("payments").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
