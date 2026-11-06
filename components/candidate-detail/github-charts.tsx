"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import { config } from "@/lib/config";
import { useI18n } from "@/lib/i18n";
import type { GithubEvidence } from "@/lib/types";

export function GithubCharts({ github }: { github: GithubEvidence }) {
  const { t, formatDate } = useI18n();

  const languages = useMemo(() => {
    const entries = Object.entries(github.aggregateLanguages);
    const total = entries.reduce((sum, [, bytes]) => sum + bytes, 0) || 1;
    return entries
      .slice(0, config.ui.maxChartLanguages)
      .map(([name, bytes]) => ({ name, share: Math.round((bytes / total) * 1000) / 10 }));
  }, [github.aggregateLanguages]);

  const activity = useMemo(
    () =>
      github.commitsByMonth.map(({ month, count }) => ({
        month: formatDate(`${month}-01`, { month: "short", year: "2-digit", timeZone: "UTC" }),
        count,
      })),
    [formatDate, github.commitsByMonth],
  );

  const languageConfig: ChartConfig = {
    share: { label: t("detail.github.languagesTitle"), color: "var(--chart-1)" },
  };
  const activityConfig: ChartConfig = {
    count: { label: t("detail.github.commitsLabel"), color: "var(--chart-1)" },
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{t("detail.github.languagesTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={languageConfig} className="h-64 w-full">
            <BarChart data={languages} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" unit="%" tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" width={90} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="share" fill="var(--color-share)" radius={4} isAnimationActive={false} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("detail.github.activityTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={activityConfig} className="h-64 w-full">
            <BarChart data={activity} margin={{ left: -16, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={3} isAnimationActive={false} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
