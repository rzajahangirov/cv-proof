"use client";

import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useStore } from "@/lib/store";

const DEFAULT_FALLBACK = (
  <div className="space-y-4">
    <Skeleton className="h-8 w-64" />
    <Skeleton className="h-5 w-96" />
    <Skeleton className="h-64 w-full" />
  </div>
);

/** localStorage is only readable after mount; until then show a neutral skeleton. */
export function HydrationGate({
  children,
  fallback = DEFAULT_FALLBACK,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const hydrated = useStore((state) => state.hydrated);
  return hydrated ? children : fallback;
}
