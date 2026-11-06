"use client";

import { FlaskConical, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { getJson } from "@/lib/api-client";
import { useT } from "@/lib/i18n";
import type { HealthInfo } from "@/lib/types";

export function MockBanner() {
  const t = useT();
  const [health, setHealth] = useState<HealthInfo | null>(null);

  useEffect(() => {
    getJson<HealthInfo>("/api/health").then(setHealth).catch(() => setHealth(null));
  }, []);

  if (!health) return null;

  const missing = health.ensemble.filter((model) => !model.available).map((model) => model.id);
  const warnings = [
    !health.github && t("banner.noGithubToken"),
    !health.mock && missing.length > 0 && t("banner.missingModels", { models: missing.join(", ") }),
  ].filter((message): message is string => Boolean(message));

  if (!health.mock && warnings.length === 0) return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50 text-amber-900" role="status">
      <div className="mx-auto w-full max-w-7xl space-y-1 px-6 py-2 text-sm">
        {health.mock && (
          <p className="flex items-center gap-2 font-medium">
            <FlaskConical className="size-4 shrink-0" aria-hidden />
            {t("banner.mock")}
          </p>
        )}
        {warnings.map((warning) => (
          <p key={warning} className="flex items-center gap-2">
            <TriangleAlert className="size-4 shrink-0" aria-hidden />
            {warning}
          </p>
        ))}
      </div>
    </div>
  );
}
