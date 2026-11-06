"use client";

import { Check, ChevronRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { useT } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n/core";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const STEPS: { href: string; label: MessageKey }[] = [
  { href: "/job", label: "nav.job" },
  { href: "/upload", label: "nav.upload" },
  { href: "/candidates", label: "nav.candidates" },
];

export function TopBar() {
  const t = useT();
  const pathname = usePathname();
  const hasJob = useStore((state) => state.job !== null);
  const hasCandidates = useStore((state) => state.candidates.length > 0);
  const completed = [hasJob, hasCandidates, false];

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-6 px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <ShieldCheck className="size-6 text-primary" aria-hidden />
          <span className="text-lg">{t("app.name")}</span>
        </Link>

        <div className="flex items-center gap-3">
          <nav className="flex items-center gap-1" aria-label={t("app.name")}>
            {STEPS.map((step, index) => {
              const active = pathname.startsWith(step.href);
              return (
                <div key={step.href} className="flex items-center gap-1">
                  {index > 0 && <ChevronRight className="size-4 text-muted-foreground" aria-hidden />}
                  <Link
                    href={step.href}
                    aria-current={active ? "step" : undefined}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-5 items-center justify-center rounded-full text-xs",
                        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {completed[index] && !active ? <Check className="size-3" aria-hidden /> : index + 1}
                    </span>
                    {t(step.label)}
                  </Link>
                </div>
              );
            })}
          </nav>
          <LocaleSwitcher />
        </div>
      </div>
    </header>
  );
}
