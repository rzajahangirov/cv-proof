"use client";

import { CircleCheck, CircleX, Clock, Copy } from "lucide-react";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useT } from "@/lib/i18n";
import type { Translate } from "@/lib/i18n/core";
import type { InterviewKit } from "@/lib/types";

function kitToText(kit: InterviewKit, t: Translate): string {
  const questions = kit.questions.map((question, index) =>
    [
      `${index + 1}. ${question.question}`,
      `${t("detail.interview.why")}: ${question.why}`,
      `${t("detail.interview.goodAnswer")}:`,
      ...question.goodAnswer.map((point) => `  - ${point}`),
      `${t("detail.interview.weakAnswer")}:`,
      ...question.weakAnswerSigns.map((point) => `  - ${point}`),
    ].join("\n"),
  );

  const task = [
    `${t("detail.interview.taskTitle")}: ${kit.task.title}`,
    t("detail.interview.taskTime", { minutes: kit.task.timeLimitMinutes }),
    kit.task.description,
    `${t("detail.interview.acceptance")}:`,
    ...kit.task.acceptanceCriteria.map((point) => `  - ${point}`),
  ].join("\n");

  return [...questions, task].join("\n\n");
}

export function InterviewTab({ kit }: { kit: InterviewKit | null }) {
  const t = useT();

  if (!kit) return <p className="text-muted-foreground">{t("detail.interview.none")}</p>;

  async function copyAll(content: InterviewKit) {
    try {
      await navigator.clipboard.writeText(kitToText(content, t));
      toast.success(t("common.copied"));
    } catch {
      toast.error(t("common.copyFailed"));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" onClick={() => copyAll(kit)}>
          <Copy aria-hidden />
          {t("detail.interview.copyAll")}
        </Button>
      </div>

      <Card>
        <CardContent>
          <Accordion type="multiple">
            {kit.questions.map((question) => (
              <AccordionItem key={question.id} value={question.id}>
                <AccordionTrigger>
                  <span className="flex items-start gap-2 text-left">
                    <Badge variant="secondary" className="mt-0.5 shrink-0">
                      {t(`detail.interview.type.${question.type}`)}
                    </Badge>
                    {question.question}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">{t("detail.interview.why")}: </span>
                    {question.why}
                  </p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="font-medium">{t("detail.interview.goodAnswer")}</p>
                      <ul className="mt-1 space-y-1">
                        {question.goodAnswer.map((point) => (
                          <li key={point} className="flex gap-2 text-muted-foreground">
                            <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium">{t("detail.interview.weakAnswer")}</p>
                      <ul className="mt-1 space-y-1">
                        {question.weakAnswerSigns.map((point) => (
                          <li key={point} className="flex gap-2 text-muted-foreground">
                            <CircleX className="mt-0.5 size-4 shrink-0 text-red-600" aria-hidden />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            {t("detail.interview.taskTitle")}: {kit.task.title}
            <Badge variant="outline">
              <Clock aria-hidden />
              {t("detail.interview.taskTime", { minutes: kit.task.timeLimitMinutes })}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground">{kit.task.description}</p>
          <div>
            <p className="font-medium">{t("detail.interview.acceptance")}</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-muted-foreground">
              {kit.task.acceptanceCriteria.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
