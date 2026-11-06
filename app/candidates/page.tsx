"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CandidatesTable, rankCandidates } from "@/components/candidates/candidates-table";
import { SummaryCards } from "@/components/candidates/summary-cards";
import { TransferButtons } from "@/components/candidates/transfer-buttons";
import { HydrationGate } from "@/components/layout/hydration-gate";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/lib/i18n";
import { decisionSchema } from "@/lib/schemas";
import { useStore } from "@/lib/store";

const ALL = "all";

function CandidatesContent() {
  const t = useT();
  const candidates = useStore((state) => state.candidates);
  const [search, setSearch] = useState("");
  const [decision, setDecision] = useState(ALL);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rankCandidates(candidates).filter((candidate) => {
      if (decision !== ALL && candidate.decision !== decision) return false;
      if (!query) return true;
      return [candidate.profile?.name, candidate.fileName, candidate.profile?.githubUsername]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query));
    });
  }, [candidates, decision, search]);

  if (candidates.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground">{t("candidates.empty")}</p>
        <Button asChild>
          <Link href="/upload">{t("candidates.goToUpload")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SummaryCards candidates={candidates} />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-64 flex-1">
          <Search
            className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("candidates.search")}
            aria-label={t("candidates.search")}
            className="pl-8"
          />
        </div>
        <Select value={decision} onValueChange={setDecision}>
          <SelectTrigger className="w-52" aria-label={t("candidates.colDecision")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("candidates.filterAll")}</SelectItem>
            {decisionSchema.options.map((option) => (
              <SelectItem key={option} value={option}>
                {t(`decision.${option}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <CandidatesTable rows={rows} />
    </div>
  );
}

export default function CandidatesPage() {
  const t = useT();
  return (
    <>
      <PageHeader
        title={t("candidates.title")}
        subtitle={t("candidates.subtitle")}
        actions={
          <HydrationGate fallback={null}>
            <TransferButtons />
          </HydrationGate>
        }
      />
      <HydrationGate>
        <CandidatesContent />
      </HydrationGate>
    </>
  );
}
