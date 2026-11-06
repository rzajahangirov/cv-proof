"use client";

import { BadgeCheck, BadgeHelp, Ban, Hourglass, Mail, ShieldAlert, UserCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { ScoreGauge } from "@/components/candidate-detail/score-gauge";
import { DecisionBadge, FlagIcons } from "@/components/candidates/badges";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import type { Candidate, HrDecision } from "@/lib/types";

const HR_ACTIONS: { decision: HrDecision; icon: LucideIcon }[] = [
  { decision: "invite", icon: UserCheck },
  { decision: "reject", icon: Ban },
  { decision: "hold", icon: Hourglass },
];

export function DetailHeader({ candidate }: { candidate: Candidate }) {
  const t = useT();
  const setHrDecision = useStore((state) => state.setHrDecision);
  const { profile, flags } = candidate;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-6">
          <ScoreGauge score={candidate.finalScore} label={t("detail.finalScore")} />

          <div className="min-w-64 flex-1 space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {profile?.name ?? t("candidates.unknownName")}
            </h1>
            <p className="text-sm text-muted-foreground">{candidate.fileName}</p>
            <div className="flex flex-wrap items-center gap-2">
              {candidate.step === "done" && <DecisionBadge decision={candidate.decision} />}
              <Badge variant="outline" className="h-6 px-2.5">
                {candidate.verified ? (
                  <BadgeCheck className="text-emerald-600" aria-hidden />
                ) : (
                  <BadgeHelp className="text-muted-foreground" aria-hidden />
                )}
                {t(candidate.verified ? "detail.verified" : "detail.notVerified")}
              </Badge>
              <FlagIcons candidate={candidate} />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">{t("detail.hrTitle")}</p>
            <div className="flex flex-wrap gap-2">
              {HR_ACTIONS.map(({ decision, icon: Icon }) => {
                const selected = candidate.hrDecision === decision;
                return (
                  <Button
                    key={decision}
                    variant={selected ? "default" : "outline"}
                    aria-pressed={selected}
                    onClick={() => setHrDecision(candidate.id, selected ? null : decision)}
                  >
                    <Icon aria-hidden />
                    {t(`hrDecision.${decision}`)}
                  </Button>
                );
              })}
              <Button variant="ghost" onClick={() => toast.info(t("common.comingSoon"))}>
                <Mail aria-hidden />
                {t("detail.emailMock")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {flags.injectionDetected && (
        <Alert variant="destructive">
          <ShieldAlert aria-hidden />
          <AlertTitle>{t("detail.injectionTitle")}</AlertTitle>
          <AlertDescription>
            <p>{t("detail.injectionText")}</p>
            {flags.injectionSnippets.length === 0 ? (
              <p>{t("detail.injectionNoSnippet")}</p>
            ) : (
              <ul className="mt-1 list-disc pl-4">
                {flags.injectionSnippets.map((snippet) => (
                  <li key={snippet} className="font-mono text-xs">
                    {snippet}
                  </li>
                ))}
              </ul>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
