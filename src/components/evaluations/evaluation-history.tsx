import type { Evaluation } from "@/lib/api/evaluations";
import { evaluationAverage, PILLARS } from "@/lib/rules/evaluations";
import { Stars } from "./stars";

export function EvaluationHistory({ items }: { items: Evaluation[] }) {
  if (items.length === 0)
    return <p className="text-sm text-muted-foreground">Aún no hay evaluaciones registradas.</p>;
  return (
    <div className="space-y-3">
      {items.map((e) => (
        <div key={e.id} className="rounded-lg border border-border/60 p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">
              {e.period} <span className="text-xs text-muted-foreground">· {e.evaluated_on}</span>
            </p>
            <p className="font-display text-lg font-semibold text-primary">
              {evaluationAverage(e).toFixed(1)} / 5
            </p>
          </div>
          <div className="mt-2 grid gap-1 sm:grid-cols-2">
            {PILLARS.map((p) => (
              <div key={p.key} className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">{p.label}</span>
                <Stars value={e[p.key]} size="sm" />
              </div>
            ))}
          </div>
          {e.strengths ? <p className="mt-2"><strong>Fortalezas:</strong> {e.strengths}</p> : null}
          {e.improvements ? <p><strong>A mejorar:</strong> {e.improvements}</p> : null}
        </div>
      ))}
    </div>
  );
}
