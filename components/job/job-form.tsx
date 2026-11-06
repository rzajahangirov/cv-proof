"use client";

import { Loader2, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ApiClientError, postJson } from "@/lib/api-client";
import { config } from "@/lib/config";
import { useI18n } from "@/lib/i18n";
import { errorKey } from "@/lib/i18n/core";
import { useStore } from "@/lib/store";
import type { Criterion, Job, JobParseResponse } from "@/lib/types";

const WEIGHTS: Criterion["weight"][] = [1, 2, 3, 4, 5];

function SliderField({
  label,
  hint,
  display,
  children,
}: {
  label: string;
  hint: string;
  display: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm font-semibold tabular-nums text-primary">{display}</span>
      </div>
      {children}
      <p className="text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}

export function JobForm({ initialJob }: { initialJob: Job | null }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const setJob = useStore((state) => state.setJob);

  const [rawText, setRawText] = useState(initialJob?.rawText ?? "");
  const [title, setTitle] = useState(initialJob?.title ?? "");
  const [criteria, setCriteria] = useState<Criterion[]>(initialJob?.criteria ?? []);
  const [threshold, setThreshold] = useState(
    initialJob?.threshold ?? config.scoring.defaultThreshold,
  );
  const [recommendThreshold, setRecommendThreshold] = useState(
    initialJob?.recommendThreshold ?? config.scoring.defaultRecommendThreshold,
  );
  const [cvWeight, setCvWeight] = useState(initialJob?.cvWeight ?? config.scoring.defaultCvWeight);
  const [extracting, setExtracting] = useState(false);

  function updateCriterion(id: string, changes: Partial<Criterion>) {
    setCriteria((rows) => rows.map((row) => (row.id === id ? { ...row, ...changes } : row)));
  }

  function addRow() {
    setCriteria((rows) => [
      ...rows,
      { id: crypto.randomUUID(), name: "", description: "", type: "nice", weight: 3 },
    ]);
  }

  async function extract() {
    if (rawText.trim().length < config.job.minChars) {
      toast.error(t("job.textTooShort", { min: config.job.minChars }));
      return;
    }
    setExtracting(true);
    try {
      const parsed = await postJson<JobParseResponse>("/api/job/parse", {
        text: rawText,
        lang: locale,
      });
      setTitle(parsed.title);
      setCriteria(parsed.criteria);
    } catch (error) {
      toast.error(t(errorKey(error instanceof ApiClientError ? error.code : null)));
    } finally {
      setExtracting(false);
    }
  }

  function save() {
    if (!title.trim()) return void toast.error(t("job.needTitle"));
    if (criteria.length === 0) return void toast.error(t("job.needCriteria"));
    if (criteria.some((row) => !row.name.trim())) {
      return void toast.error(t("job.needCriterionName"));
    }

    setJob({
      title: title.trim(),
      rawText,
      criteria,
      threshold,
      recommendThreshold,
      cvWeight,
      lang: locale,
    });
    toast.success(t("job.saved"));
    router.push("/upload");
  }

  const cvPercent = Math.round(cvWeight * 100);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-3">
          <label htmlFor="job-text" className="text-sm font-medium">
            {t("job.rawLabel")}
          </label>
          <Textarea
            id="job-text"
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
            placeholder={t("job.rawPlaceholder")}
            maxLength={config.job.maxChars}
            className="min-h-44"
          />
          <Button onClick={extract} disabled={extracting}>
            {extracting ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
            {t(extracting ? "job.extracting" : "job.extract")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("job.criteriaTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-md space-y-2">
            <label htmlFor="job-title" className="text-sm font-medium">
              {t("job.titleLabel")}
            </label>
            <Input
              id="job-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t("job.titlePlaceholder")}
            />
          </div>

          {criteria.length === 0 ? (
            <p className="rounded-md border border-dashed p-6 text-center text-muted-foreground">
              {t("job.criteriaEmpty")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/4">{t("job.colName")}</TableHead>
                  <TableHead>{t("job.colDescription")}</TableHead>
                  <TableHead className="w-24 text-center">{t("job.colMust")}</TableHead>
                  <TableHead className="w-24">{t("job.colWeight")}</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {criteria.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Input
                        aria-label={t("job.colName")}
                        value={row.name}
                        onChange={(event) => updateCriterion(row.id, { name: event.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        aria-label={t("job.colDescription")}
                        value={row.description}
                        onChange={(event) =>
                          updateCriterion(row.id, { description: event.target.value })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        aria-label={t("job.colMust")}
                        checked={row.type === "must"}
                        onCheckedChange={(checked) =>
                          updateCriterion(row.id, { type: checked ? "must" : "nice" })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={String(row.weight)}
                        onValueChange={(value) =>
                          updateCriterion(row.id, { weight: Number(value) as Criterion["weight"] })
                        }
                      >
                        <SelectTrigger aria-label={t("job.colWeight")}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {WEIGHTS.map((weight) => (
                            <SelectItem key={weight} value={String(weight)}>
                              {weight}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t("job.deleteRow")}
                        onClick={() =>
                          setCriteria((rows) => rows.filter((item) => item.id !== row.id))
                        }
                      >
                        <Trash2 aria-hidden />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <Button variant="outline" onClick={addRow}>
            <Plus aria-hidden />
            {t("job.addRow")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("job.thresholdsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-8 md:grid-cols-3">
          <SliderField
            label={t("job.threshold")}
            hint={t("job.thresholdHint")}
            display={String(threshold)}
          >
            <Slider
              aria-label={t("job.threshold")}
              value={[threshold]}
              min={0}
              max={100}
              step={5}
              onValueChange={([value]) => setThreshold(value)}
            />
          </SliderField>
          <SliderField
            label={t("job.recommendThreshold")}
            hint={t("job.recommendThresholdHint")}
            display={String(recommendThreshold)}
          >
            <Slider
              aria-label={t("job.recommendThreshold")}
              value={[recommendThreshold]}
              min={0}
              max={100}
              step={5}
              onValueChange={([value]) => setRecommendThreshold(value)}
            />
          </SliderField>
          <SliderField
            label={t("job.cvWeight")}
            hint={t("job.cvWeightHint")}
            display={t("job.cvWeightValue", { cv: cvPercent, github: 100 - cvPercent })}
          >
            <Slider
              aria-label={t("job.cvWeight")}
              value={[cvPercent]}
              min={0}
              max={100}
              step={5}
              onValueChange={([value]) => setCvWeight(value / 100)}
            />
          </SliderField>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button size="lg" onClick={save}>
          <Save aria-hidden />
          {t("job.save")}
        </Button>
      </div>
    </div>
  );
}
