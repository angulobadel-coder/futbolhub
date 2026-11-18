/** Valores por defecto de la configuración de cada escuela. */
export const DEFAULT_SETTINGS = {
  contact_phone: null as string | null,
  contact_email: null as string | null,
  address: null as string | null,
  primary_color: null as string | null,
  season_label: null as string | null,
  attendance_threshold: 70,
  monthly_fee: null as number | null,
  payment_due_day: 10,
  late_fee: null as number | null,
  whatsapp_enabled: false,
  notify_payments: true,
  notify_attendance: true,
};

export function clampThreshold(value: number) {
  if (!Number.isFinite(value)) return 70;
  return Math.min(100, Math.max(1, Math.round(value)));
}

export function clampDueDay(value: number) {
  if (!Number.isFinite(value)) return 10;
  return Math.min(28, Math.max(1, Math.round(value)));
}

/** Convierte un texto en valor COP positivo, o null si está vacío. Lanza si es inválido. */
export function parseMoney(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isInteger(n) || n < 0) throw new Error("Ingresa un valor en pesos sin decimales");
  return n;
}
