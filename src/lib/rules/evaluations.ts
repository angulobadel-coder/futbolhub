export const PILLARS = [
  { key: "technique", label: "Técnica" },
  { key: "tactics", label: "Táctica" },
  { key: "physical", label: "Física" },
  { key: "attitude", label: "Actitud y disciplina" },
] as const;

export type PillarKey = (typeof PILLARS)[number]["key"];
export type Scores = Record<PillarKey, number>;

/** Promedio general sobre 5, con un decimal. */
export function evaluationAverage(s: Scores): number {
  const sum = s.technique + s.tactics + s.physical + s.attitude;
  return Math.round((sum / 4) * 10) / 10;
}

export function isValidScore(n: number) {
  return Number.isInteger(n) && n >= 1 && n <= 5;
}

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

/** Períodos sugeridos para una fecha dada. */
export function suggestedPeriods(date: Date): string[] {
  const y = date.getFullYear();
  const q = Math.floor(date.getMonth() / 3) + 1;
  return [
    "Diagnóstico inicial",
    `${MONTHS[date.getMonth()]} ${y}`,
    `${["I", "II", "III", "IV"][q - 1]} Trimestre ${y}`,
    `Cierre de año ${y}`,
  ];
}
