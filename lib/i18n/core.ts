import { az } from "@/lib/i18n/messages/az";
import type { Messages } from "@/lib/i18n/messages/az";
import type { Lang } from "@/lib/types";

type Leaves<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : Leaves<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type MessageKey = Leaves<Messages>;
export type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

/** Add `en` here once `en.ts` exists; the language switcher then appears. */
const catalogs: Partial<Record<Lang, Messages>> = { az };

export const availableLocales = Object.keys(catalogs) as Lang[];

export const intlLocales: Record<Lang, string> = { az: "az-AZ", en: "en-US" };

export function translate(
  locale: Lang,
  key: MessageKey,
  vars?: Record<string, string | number>,
): string {
  const catalog = catalogs[locale] ?? az;
  const value = key
    .split(".")
    .reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], catalog);
  const text = typeof value === "string" ? value : key;
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => String(vars[name] ?? match));
}

/** API and pipeline errors are stored as codes and rendered here. */
export function errorKey(code: string | null): MessageKey {
  return code && code in az.errors ? (`errors.${code}` as MessageKey) : "errors.unknown";
}
