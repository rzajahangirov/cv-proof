"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { availableLocales } from "@/lib/i18n/core";
import { langSchema } from "@/lib/schemas";
import { useStore } from "@/lib/store";

/** Stays hidden until a second language exists in `availableLocales`. */
export function LocaleSwitcher() {
  const { locale, t } = useI18n();
  const setLocale = useStore((state) => state.setLocale);

  if (availableLocales.length < 2) return null;

  return (
    <Select value={locale} onValueChange={(value) => setLocale(langSchema.parse(value))}>
      <SelectTrigger className="w-20" aria-label={t("common.language")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {availableLocales.map((code) => (
          <SelectItem key={code} value={code}>
            {code.toUpperCase()}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
