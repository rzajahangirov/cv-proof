"use client";

import { CircleAlert, CircleCheck, CircleDashed, CircleX, Loader2, RotateCw, X } from "lucide-react";
import { Fragment } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { errorKey } from "@/lib/i18n/core";
import type { MessageKey } from "@/lib/i18n/core";
import { canRetry, retryCandidate } from "@/lib/pipeline/runner";
import { isRunning, useStore } from "@/lib/store";
import type { Candidate, PipelineStep } from "@/lib/types";
import { cn } from "@/lib/utils";

type StageState = "done" | "warning" | "active" | "failed" | "skipped" | "pending";

const STAGES: { label: MessageKey; step: PipelineStep; isDone: (c: Candidate) => boolean }[] = [
  { label: "pipeline.parse", step: "parsing", isDone: (c) => c.profile !== null },
  { label: "pipeline.score", step: "screening", isDone: (c) => c.stage1 !== null },
  {
    label: "pipeline.github",
    step: "collecting",
    isDone: (c) => c.github !== null || c.flags.githubError !== null,
  },
  { label: "pipeline.ai", step: "scoring", isDone: (c) => c.consensus !== null },
  { label: "pipeline.interview", step: "interview", isDone: (c) => c.interview !== null },
];

function stageState(candidate: Candidate, index: number): StageState {
  const stage = STAGES[index];
  if (stage.step === "collecting" && candidate.flags.githubError) return "warning";
  if (stage.isDone(candidate)) return "done";
  if (candidate.step === stage.step) return "active";
  if (candidate.step === "done") return "skipped";
  if (candidate.step === "error" && STAGES.slice(0, index).every((s) => s.isDone(candidate))) {
    return "failed";
  }
  return "pending";
}

const STAGE_STYLES: Record<StageState, string> = {
  done: "text-emerald-700",
  warning: "text-amber-700 font-medium",
  active: "text-primary font-medium",
  failed: "text-red-700 font-medium",
  skipped: "text-muted-foreground/60 line-through",
  pending: "text-muted-foreground/60",
};

function StageIcon({ state }: { state: StageState }) {
  if (state === "done") return <CircleCheck className="size-4" aria-hidden />;
  if (state === "warning") return <CircleAlert className="size-4" aria-hidden />;
  if (state === "active") return <Loader2 className="size-4 animate-spin" aria-hidden />;
  if (state === "failed") return <CircleX className="size-4" aria-hidden />;
  return <CircleDashed className="size-4" aria-hidden />;
}

export function ProgressRow({ candidate }: { candidate: Candidate }) {
  const t = useT();
  const removeCandidate = useStore((state) => state.removeCandidate);

  const statusText =
    candidate.step === "error"
      ? t(errorKey(candidate.error))
      : candidate.step === "done" && candidate.flags.githubError
        ? t(errorKey(candidate.flags.githubError))
        : t(`step.${candidate.step}`);

  return (
    <div className="flex items-center gap-4 border-b px-1 py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium" title={candidate.fileName}>
          {candidate.profile?.name ?? candidate.fileName}
        </p>
        <p
          className={cn(
            "truncate text-sm",
            candidate.step === "error" && "text-red-700",
            candidate.step === "done" && candidate.flags.githubError && "text-amber-700",
            candidate.step !== "error" && !candidate.flags.githubError && "text-muted-foreground",
          )}
        >
          {statusText}
        </p>
      </div>

      <ol className="hidden items-center gap-1.5 text-sm md:flex">
        {STAGES.map((stage, index) => {
          const state = stageState(candidate, index);
          return (
            <Fragment key={stage.label}>
              {index > 0 && <li aria-hidden className="h-px w-3 bg-border" />}
              <li className={cn("flex items-center gap-1", STAGE_STYLES[state])}>
                <StageIcon state={state} />
                {t(stage.label)}
              </li>
            </Fragment>
          );
        })}
      </ol>

      <div className="flex w-44 shrink-0 justify-end gap-1">
        {canRetry(candidate) && (
          <Button variant="outline" size="sm" onClick={() => retryCandidate(candidate.id)}>
            <RotateCw aria-hidden />
            {t("upload.retry")}
          </Button>
        )}
        {!isRunning(candidate) && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("upload.removeFile")}
            onClick={() => removeCandidate(candidate.id)}
          >
            <X aria-hidden />
          </Button>
        )}
      </div>
    </div>
  );
}
