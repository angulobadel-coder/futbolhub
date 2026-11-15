import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stars({
  value,
  onChange,
  size = "md",
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const icon = (
          <Star
            className={cn(
              size === "sm" ? "size-3.5" : "size-6",
              n <= Math.round(value) ? "fill-primary text-primary" : "text-muted-foreground/40",
            )}
          />
        );
        return onChange ? (
          <button key={n} type="button" aria-label={`${n} estrellas`} onClick={() => onChange(n)}>
            {icon}
          </button>
        ) : (
          <span key={n}>{icon}</span>
        );
      })}
    </div>
  );
}
