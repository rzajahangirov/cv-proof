import { exportFileSchema } from "@/lib/schemas";
import type { ExportFile } from "@/lib/types";

export function downloadJson(data: ExportFile, fileName: string): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function parseExport(text: string): ExportFile | null {
  try {
    const result = exportFileSchema.safeParse(JSON.parse(text));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export type DemoResult = { status: "ok"; data: ExportFile } | { status: "missing" | "invalid" };

// TODO(HUMAN): run a real analysis, export it and save it as public/demo/demo-results.json.
export async function fetchDemo(): Promise<DemoResult> {
  const response = await fetch("/demo/demo-results.json").catch(() => null);
  if (!response?.ok) return { status: "missing" };
  const data = parseExport(await response.text());
  return data ? { status: "ok", data } : { status: "invalid" };
}
