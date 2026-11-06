"use client";

import { VerdictBadge } from "@/components/candidates/badges";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import type { Stage1Result } from "@/lib/types";

export function CvTab({ stage1 }: { stage1: Stage1Result }) {
  const t = useT();
  const job = useStore((state) => state.job);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-start gap-8">
          <div>
            <p className="text-sm text-muted-foreground">{t("detail.cv.stage1Score")}</p>
            <p className="text-3xl font-semibold tabular-nums">{stage1.score}</p>
            {job && (
              <p className="text-sm text-muted-foreground">
                {t("detail.cv.threshold", { value: job.threshold })}
              </p>
            )}
            {stage1.knockout && (
              <Badge variant="destructive" className="mt-2">
                {t("detail.cv.knockout")}
              </Badge>
            )}
          </div>
          <div className="min-w-64 flex-1">
            <p className="text-sm font-medium">{t("detail.cv.summary")}</p>
            <p className="mt-1 text-muted-foreground">{stage1.summary}</p>
          </div>
        </CardContent>
      </Card>

      {stage1.criteria.map((entry) => {
        const criterion = job?.criteria.find((item) => item.id === entry.criterionId);
        return (
          <Card key={entry.criterionId} size="sm">
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2">
                <VerdictBadge verdict={entry.verdict} />
                {criterion?.name ?? t("detail.cv.criterionRemoved")}
                {criterion && (
                  <span className="text-sm font-normal text-muted-foreground">
                    {t(criterion.type === "must" ? "detail.cv.must" : "detail.cv.nice")}
                    {" · "}
                    {t("detail.cv.weight", { value: criterion.weight })}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm md:grid-cols-2">
              <div>
                <p className="font-medium">{t("detail.cv.evidence")}</p>
                <p className="text-muted-foreground">
                  {entry.evidence || t("detail.cv.noEvidence")}
                </p>
              </div>
              <div>
                <p className="font-medium">{t("detail.cv.reasoning")}</p>
                <p className="text-muted-foreground">{entry.reasoning}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
