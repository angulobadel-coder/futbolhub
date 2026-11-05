export type Phase = "calentamiento" | "principal" | "vuelta_calma";

export const PHASES: { id: Phase; label: string; hint: string }[] = [
  { id: "calentamiento", label: "Calentamiento", hint: "Activación, movilidad, rondos (15–20 min)" },
  { id: "principal", label: "Fase principal", hint: "Objetivo del día, 2 a 4 tareas (45–60 min)" },
  { id: "vuelta_calma", label: "Vuelta a la calma", hint: "Estiramientos y charla final (10 min)" },
];

export interface DrillLike {
  phase: string;
  duration_min: number;
  materials: string | null;
}

/** Minutos totales por fase y total general del plan. */
export function phaseTotals(drills: DrillLike[]) {
  const byPhase: Record<Phase, number> = { calentamiento: 0, principal: 0, vuelta_calma: 0 };
  for (const d of drills) {
    if (d.phase in byPhase) byPhase[d.phase as Phase] += Math.max(0, d.duration_min || 0);
  }
  return { byPhase, total: byPhase.calentamiento + byPhase.principal + byPhase.vuelta_calma };
}

/** Duración programada de la sesión en minutos (null si no hay hora fin). */
export function sessionMinutes(start: string, end: string | null) {
  if (!end) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const diff = eh * 60 + em - (sh * 60 + sm);
  return diff > 0 ? diff : null;
}

/** Lista única de materiales (separados por coma o salto de línea). */
export function materialsList(drills: DrillLike[]) {
  const set = new Map<string, string>();
  for (const d of drills) {
    for (const raw of (d.materials ?? "").split(/[,\n]/)) {
      const item = raw.trim();
      if (item) set.set(item.toLowerCase(), item);
    }
  }
  return [...set.values()];
}
