export type PaymentStatus = "pagado" | "pendiente" | "vencido";

export interface PaymentLike {
  amount: number;
  due_date: string;
  paid_at: string | null;
}

/** Pagado si tiene fecha de pago; vencido si la fecha límite ya pasó; si no, pendiente. */
export function paymentStatus(p: PaymentLike, today: string): PaymentStatus {
  if (p.paid_at) return "pagado";
  return p.due_date < today ? "vencido" : "pendiente";
}

export function summarizePayments(list: PaymentLike[], today: string) {
  const out = { collected: 0, pending: 0, overdue: 0, overdueCount: 0 };
  for (const p of list) {
    const s = paymentStatus(p, today);
    if (s === "pagado") out.collected += p.amount;
    else if (s === "pendiente") out.pending += p.amount;
    else {
      out.overdue += p.amount;
      out.overdueCount += 1;
    }
  }
  return out;
}

export function formatCOP(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pagado: "Pagado",
  pendiente: "Pendiente",
  vencido: "Vencido",
};
