import { describe, expect, it } from "vitest";
import { paymentStatus, summarizePayments } from "./payments";

const today = "2026-10-07";

describe("estado de pagos", () => {
  it("con fecha de pago queda pagado aunque esté vencido", () => {
    expect(paymentStatus({ amount: 1, due_date: "2026-09-01", paid_at: "2026-10-01" }, today)).toBe("pagado");
  });
  it("sin pagar y fecha límite pasada queda vencido", () => {
    expect(paymentStatus({ amount: 1, due_date: "2026-10-06", paid_at: null }, today)).toBe("vencido");
  });
  it("sin pagar y vence hoy sigue pendiente", () => {
    expect(paymentStatus({ amount: 1, due_date: today, paid_at: null }, today)).toBe("pendiente");
  });
  it("suma recaudado, pendiente y vencido", () => {
    const s = summarizePayments(
      [
        { amount: 80000, due_date: "2026-10-01", paid_at: "2026-10-01" },
        { amount: 80000, due_date: "2026-10-30", paid_at: null },
        { amount: 50000, due_date: "2026-09-30", paid_at: null },
      ],
      today,
    );
    expect(s).toEqual({ collected: 80000, pending: 80000, overdue: 50000, overdueCount: 1 });
  });
});
