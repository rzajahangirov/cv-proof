"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useT } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n/core";
import type { Candidate, Decision } from "@/lib/types";
import { cn } from "@/lib/utils";

const CARDS: { label: MessageKey; decision: Decision | null; accent: string }[] = [
  { label: "candidates.summaryTotal", decision: null, accent: "text-foreground" },
  { label: "candidates.summaryRecommended", decision: "recommended", accent: "text-emerald-700" },
  { label: "candidates.summaryNeedsReview", decision: "needs_review", accent: "text-violet-700" },
  { label: "candidates.summaryManual", decision: "manual_review", accent: "text-amber-700" },
  { label: "candidates.summaryRejected", decision: "rejected", accent: "text-zinc-600" },
];

export function SummaryCards({ candidates }: { candidates: Candidate[] }) {
  const t = useT();

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
      {CARDS.map(({ label, decision, accent }) => (
        <Card key={label}>
          <CardContent>
            <p className="text-sm text-muted-foreground">{t(label)}</p>
            <p className={cn("mt-1 text-3xl font-semibold tabular-nums", accent)}>
              {decision
                ? candidates.filter((candidate) => candidate.decision === decision).length
                : candidates.length}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
