"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import { useStore } from "@/lib/store";

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    void useStore.persist.rehydrate();
  }, []);

  return (
    <I18nProvider>
      <TooltipProvider>
        {children}
        <Toaster richColors position="top-right" />
      </TooltipProvider>
    </I18nProvider>
  );
}
