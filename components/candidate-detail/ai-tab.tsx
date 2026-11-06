"use client";

import { Scale, ThumbsUp } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useT } from "@/lib/i18n";
import { errorKey } from "@/lib/i18n/core";
import type { Candidate, ModelScore } from "@/lib/types";

function BulletList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-sm font-medium">{title}</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-muted-foreground">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function ModelCard({ score }: { score: ModelScore }) {
  const t = useT();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="truncate font-mono text-sm" title={score.modelId}>
            {score.modelId}
          </span>
          {score.ok && <span className="text-2xl font-semibold tabular-nums">{score.score}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {score.ok ? (
          <>
            <p className="text-sm text-muted-foreground">{score.summary}</p>
            <BulletList title={t("detail.ai.strengths")} items={score.strengths} />
            <BulletList title={t("detail.ai.concerns")} items={score.concerns} />
          </>
        ) : (
          <Alert variant="destructive">
            <AlertDescription>
              <p className="font-medium">{t("detail.ai.modelFailed")}</p>
              <p className="break-words">{t(errorKey(score.error))}</p>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

export function AiTab({ candidate }: { candidate: Candidate }) {
  const t = useT();
  const { consensus, modelScores } = candidate;

  if (!consensus) return <p className="text-muted-foreground">{t("detail.ai.noScores")}</p>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("detail.ai.consensusTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-8">
          <div>
            <p className="text-sm text-muted-foreground">{t("detail.ai.mean")}</p>
            <p className="text-3xl font-semibold tabular-nums">{consensus.mean}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t("detail.ai.spread")}</p>
            <p className="text-3xl font-semibold tabular-nums">{consensus.spread}</p>
          </div>
          <p className="text-muted-foreground">
            {t("detail.ai.models", { ok: consensus.modelsOk, total: consensus.modelsTotal })}
          </p>
          <p
            className={
              consensus.needsReview
                ? "flex items-center gap-2 font-medium text-violet-700"
                : "flex items-center gap-2 text-emerald-700"
            }
          >
            {consensus.needsReview ? (
              <Scale className="size-4" aria-hidden />
            ) : (
              <ThumbsUp className="size-4" aria-hidden />
            )}
            {t(consensus.needsReview ? "detail.ai.disagree" : "detail.ai.agree")}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {modelScores.map((score) => (
          <ModelCard key={score.modelId} score={score} />
        ))}
      </div>
    </div>
  );
}
