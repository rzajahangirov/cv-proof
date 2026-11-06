"use client";

import { ArrowRight, Loader2, Play, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { HydrationGate } from "@/components/layout/hydration-gate";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FilePicker } from "@/components/upload/file-picker";
import { ProgressRow } from "@/components/upload/progress-row";
import { config } from "@/lib/config";
import { useT } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n/core";
import { startRun } from "@/lib/pipeline/runner";
import { isRunning, useStore } from "@/lib/store";

type Skipped = { name: string; reason: MessageKey };

function classify(file: File, knownNames: Set<string>): MessageKey | null {
  const name = file.name.toLowerCase();
  if (!config.files.extensions.some((extension) => name.endsWith(extension))) {
    return "upload.skippedUnsupported";
  }
  if (file.size > config.files.maxBytes) return "upload.skippedTooLarge";
  if (knownNames.has(file.name)) return "upload.skippedDuplicate";
  return null;
}

function UploadContent() {
  const t = useT();
  const hasJob = useStore((state) => state.job !== null);
  const candidates = useStore((state) => state.candidates);
  const addFiles = useStore((state) => state.addFiles);
  const [skipped, setSkipped] = useState<Skipped[]>([]);

  function handleFiles(files: File[]) {
    const knownNames = new Set(candidates.map((candidate) => candidate.fileName));
    const accepted: File[] = [];
    const rejected: Skipped[] = [];

    for (const file of files) {
      const reason = classify(file, knownNames);
      if (reason) {
        rejected.push({ name: file.name, reason });
      } else {
        accepted.push(file);
        knownNames.add(file.name);
      }
    }

    addFiles(accepted);
    setSkipped(rejected);
  }

  const total = candidates.length;
  const finished = candidates.filter((c) => c.step === "done" || c.step === "error").length;
  const running = candidates.some(isRunning);
  const waiting = candidates.some((c) => c.step === "queued");

  if (!hasJob) {
    return (
      <Alert>
        <TriangleAlert aria-hidden />
        <AlertDescription className="flex items-center justify-between gap-4">
          {t("upload.noJob")}
          <Button size="sm" asChild>
            <Link href="/job">{t("upload.goToJob")}</Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <FilePicker onFiles={handleFiles} />

      {skipped.length > 0 && (
        <Alert>
          <TriangleAlert aria-hidden />
          <AlertDescription>
            <p className="font-medium">{t("upload.skippedTitle")}</p>
            <ul className="mt-1 space-y-0.5">
              {skipped.map((file) => (
                <li key={file.name}>
                  {file.name}: {t(file.reason)}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>{t("upload.filesTitle")}</CardTitle>
          <div className="flex items-center gap-2">
            {finished > 0 && (
              <Button variant="outline" asChild>
                <Link href="/candidates">
                  {t("upload.viewCandidates")}
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            )}
            <Button onClick={startRun} disabled={!waiting || running}>
              {running ? <Loader2 className="animate-spin" aria-hidden /> : <Play aria-hidden />}
              {t(running ? "upload.running" : "upload.start")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {total === 0 ? (
            <p className="rounded-md border border-dashed p-6 text-center text-muted-foreground">
              {t("upload.empty")}
            </p>
          ) : (
            <>
              <div className="space-y-1">
                <Progress value={(finished / total) * 100} />
                <p className="text-sm tabular-nums text-muted-foreground">
                  {t("upload.progress", { done: finished, total })}
                </p>
              </div>
              <div>
                {candidates.map((candidate) => (
                  <ProgressRow key={candidate.id} candidate={candidate} />
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function UploadPage() {
  const t = useT();
  const maxMb = config.files.maxBytes / (1024 * 1024);
  return (
    <>
      <PageHeader title={t("upload.title")} subtitle={t("upload.subtitle", { size: maxMb })} />
      <HydrationGate>
        <UploadContent />
      </HydrationGate>
    </>
  );
}
