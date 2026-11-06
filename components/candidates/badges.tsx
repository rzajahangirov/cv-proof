"use client";

import { GitBranch, Scale, ShieldAlert, TriangleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useT } from "@/lib/i18n";
import { errorKey } from "@/lib/i18n/core";
import type { Candidate, ClaimVerdict, Decision, Verdict } from "@/lib/types";
import { cn } from "@/lib/utils";

const DECISION_STYLES: Record<Decision, string> = {
  recommended: "bg-emerald-100 text-emerald-800",
  consider: "bg-blue-100 text-blue-800",
  manual_review: "bg-amber-100 text-amber-900",
  needs_review: "bg-violet-100 text-violet-800",
  rejected: "bg-zinc-200 text-zinc-700",
};

const VERDICT_STYLES: Record<Verdict, string> = {
  met: "bg-emerald-100 text-emerald-800",
  partial: "bg-amber-100 text-amber-900",
  missing: "bg-slate-200 text-slate-700",
};

const CLAIM_STYLES: Record<ClaimVerdict, string> = {
  confirmed: "bg-emerald-100 text-emerald-800",
  partial: "bg-amber-100 text-amber-900",
  no_evidence: "bg-slate-200 text-slate-700",
  contradicted: "bg-red-100 text-red-800",
};

export function DecisionBadge({ decision }: { decision: Decision | null }) {
  const t = useT();
  if (!decision) return <span className="text-muted-foreground">{t("common.notAvailable")}</span>;
  return <Badge className={cn("h-6 px-2.5", DECISION_STYLES[decision])}>{t(`decision.${decision}`)}</Badge>;
}

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const t = useT();
  return <Badge className={VERDICT_STYLES[verdict]}>{t(`verdict.${verdict}`)}</Badge>;
}

export function ClaimVerdictBadge({ verdict }: { verdict: ClaimVerdict }) {
  const t = useT();
  return <Badge className={CLAIM_STYLES[verdict]}>{t(`claimVerdict.${verdict}`)}</Badge>;
}

function FlagIcon({ icon: Icon, label, className }: { icon: LucideIcon; label: string; className: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} aria-label={label} className="inline-flex">
          <Icon className={cn("size-4", className)} aria-hidden />
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function FlagIcons({ candidate }: { candidate: Candidate }) {
  const t = useT();
  const { flags, github, consensus } = candidate;
  const redFlagCount = github?.redFlags.length ?? 0;

  return (
    <span className="inline-flex items-center gap-2">
      {flags.injectionDetected && (
        <FlagIcon icon={ShieldAlert} label={t("candidates.flagInjection")} className="text-red-600" />
      )}
      {consensus?.needsReview && (
        <FlagIcon icon={Scale} label={t("candidates.flagNeedsReview")} className="text-violet-600" />
      )}
      {redFlagCount > 0 && (
        <FlagIcon
          icon={TriangleAlert}
          label={t("candidates.flagRedFlags", { count: redFlagCount })}
          className="text-amber-600"
        />
      )}
      {flags.githubError && (
        <FlagIcon
          icon={GitBranch}
          label={`${t("candidates.flagGithubError")}: ${t(errorKey(flags.githubError))}`}
          className="text-slate-500"
        />
      )}
    </span>
  );
}
