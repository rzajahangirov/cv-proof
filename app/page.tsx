"use client";

import { ArrowRight, FileSearch, GitBranch, MessagesSquare, RotateCcw, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { HydrationGate } from "@/components/layout/hydration-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useT } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n/core";
import { useStore } from "@/lib/store";
import { fetchDemo } from "@/lib/transfer";

const HOW_IT_WORKS: { icon: typeof Users; title: MessageKey; text: MessageKey }[] = [
  { icon: FileSearch, title: "home.step1Title", text: "home.step1Text" },
  { icon: Users, title: "home.step2Title", text: "home.step2Text" },
  { icon: GitBranch, title: "home.step3Title", text: "home.step3Text" },
  { icon: MessagesSquare, title: "home.step4Title", text: "home.step4Text" },
];

function ResetButton() {
  const t = useT();
  const reset = useStore((state) => state.reset);
  const [open, setOpen] = useState(false);

  function confirm() {
    reset();
    setOpen(false);
    toast.success(t("home.resetDone"));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="lg">
          <RotateCcw aria-hidden />
          {t("home.reset")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("home.resetTitle")}</DialogTitle>
          <DialogDescription>{t("home.resetDescription")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{t("home.resetCancel")}</Button>
          </DialogClose>
          <Button variant="destructive" onClick={confirm}>
            {t("home.resetConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HomeContent() {
  const t = useT();
  const job = useStore((state) => state.job);
  const candidateCount = useStore((state) => state.candidates.length);
  const importData = useStore((state) => state.importData);

  async function loadDemo() {
    const result = await fetchDemo();
    if (result.status === "ok") {
      importData(result.data);
      toast.success(t("home.demoLoaded"));
    } else {
      toast.error(t(result.status === "missing" ? "home.demoMissing" : "home.demoInvalid"));
    }
  }

  return (
    <div className="space-y-10">
      <section className="grid items-start gap-8 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-5 pt-2">
          <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight">
            {t("home.title")}
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">{t("app.description")}</p>
          <p className="text-lg font-medium text-primary">{t("app.tagline")}</p>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button size="lg" asChild>
              <Link href={job ? "/upload" : "/job"}>
                {t("home.start")}
                <ArrowRight aria-hidden />
              </Link>
            </Button>
            <Button variant="outline" size="lg" onClick={loadDemo}>
              <Sparkles aria-hidden />
              {t("home.demo")}
            </Button>
            <ResetButton />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("home.currentJob")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {job ? (
              <>
                <p className="text-lg font-medium">{job.title}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {t("home.criteriaCount", { count: job.criteria.length })}
                  </Badge>
                  <Badge variant="secondary">
                    {t("home.candidateCount", { count: candidateCount })}
                  </Badge>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">{t("home.noJob")}</p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">{t("home.howItWorks")}</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map(({ icon: Icon, title, text }) => (
            <Card key={title}>
              <CardContent className="space-y-2">
                <Icon className="size-5 text-primary" aria-hidden />
                <p className="font-medium">{t(title)}</p>
                <p className="text-sm text-muted-foreground">{t(text)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function HomePage() {
  return (
    <HydrationGate>
      <HomeContent />
    </HydrationGate>
  );
}
