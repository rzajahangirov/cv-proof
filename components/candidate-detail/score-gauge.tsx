import { config } from "@/lib/config";
import { cn } from "@/lib/utils";

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function scoreColor(score: number): string {
  if (score >= config.ui.gaugeGoodScore) return "text-emerald-600";
  if (score >= config.ui.gaugeMediumScore) return "text-amber-500";
  return "text-slate-400";
}

export function ScoreGauge({
  score,
  label,
  emptyLabel,
}: {
  score: number | null;
  label: string;
  emptyLabel: string;
}) {
  const value = score ?? 0;

  return (
    <div className="relative size-28 shrink-0" role="img" aria-label={`${label}: ${score ?? ""}`}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={RADIUS} fill="none" strokeWidth="9" className="stroke-muted" />
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          strokeWidth="9"
          strokeLinecap="round"
          stroke="currentColor"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - value / 100)}
          className={cn("transition-all", scoreColor(value))}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold tabular-nums">{score ?? emptyLabel}</span>
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}
