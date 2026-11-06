"use client";

import { JobForm } from "@/components/job/job-form";
import { HydrationGate } from "@/components/layout/hydration-gate";
import { PageHeader } from "@/components/layout/page-header";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";

function JobContent() {
  const job = useStore((state) => state.job);
  return <JobForm initialJob={job} />;
}

export default function JobPage() {
  const t = useT();
  return (
    <>
      <PageHeader title={t("job.title")} subtitle={t("job.subtitle")} />
      <HydrationGate>
        <JobContent />
      </HydrationGate>
    </>
  );
}
