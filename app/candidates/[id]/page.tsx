"use client";

import { ArrowLeft, RotateCw } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AiTab } from "@/components/candidate-detail/ai-tab";
import { CvTab } from "@/components/candidate-detail/cv-tab";
import { GithubTab } from "@/components/candidate-detail/github-tab";
import { DetailHeader } from "@/components/candidate-detail/header";
import { InterviewTab } from "@/components/candidate-detail/interview-tab";
import { HydrationGate } from "@/components/layout/hydration-gate";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT } from "@/lib/i18n";
import { errorKey } from "@/lib/i18n/core";
import { retryCandidate } from "@/lib/pipeline/runner";
import { useStore } from "@/lib/store";

function DetailContent() {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const candidate = useStore((state) => state.candidates.find((c) => c.id === id));

  if (!candidate) return <p className="text-muted-foreground">{t("detail.notFound")}</p>;

  return (
    <div className="space-y-6">
      <DetailHeader candidate={candidate} />

      {candidate.step === "error" && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between gap-4">
            {t("detail.failed", { reason: t(errorKey(candidate.error)) })}
            <Button variant="outline" size="sm" onClick={() => retryCandidate(candidate.id)}>
              <RotateCw aria-hidden />
              {t("upload.retry")}
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {candidate.step !== "done" && candidate.step !== "error" && (
        <Alert>
          <AlertDescription>{t("detail.pending")}</AlertDescription>
        </Alert>
      )}

      {candidate.stage1 && (
        <Tabs defaultValue="cv">
          <TabsList>
            <TabsTrigger value="cv">{t("detail.tabs.cv")}</TabsTrigger>
            <TabsTrigger value="github">{t("detail.tabs.github")}</TabsTrigger>
            <TabsTrigger value="ai">{t("detail.tabs.ai")}</TabsTrigger>
            <TabsTrigger value="interview">{t("detail.tabs.interview")}</TabsTrigger>
          </TabsList>
          <TabsContent value="cv" className="pt-2">
            <CvTab stage1={candidate.stage1} />
          </TabsContent>
          <TabsContent value="github" className="pt-2">
            <GithubTab candidate={candidate} />
          </TabsContent>
          <TabsContent value="ai" className="pt-2">
            <AiTab candidate={candidate} />
          </TabsContent>
          <TabsContent value="interview" className="pt-2">
            <InterviewTab kit={candidate.interview} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

export default function CandidateDetailPage() {
  const t = useT();
  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/candidates">
          <ArrowLeft aria-hidden />
          {t("detail.back")}
        </Link>
      </Button>
      <HydrationGate>
        <DetailContent />
      </HydrationGate>
    </div>
  );
}
