"use client";

import { Download, Upload } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { downloadJson, parseExport } from "@/lib/transfer";

export function TransferButtons() {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const exportData = useStore((state) => state.exportData);
  const importData = useStore((state) => state.importData);

  async function handleImport(file: File | undefined) {
    if (!file) return;
    const data = parseExport(await file.text());
    if (!data) return void toast.error(t("candidates.importInvalid"));
    importData(data);
    toast.success(t("candidates.imported", { count: data.candidates.length }));
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        hidden
        aria-label={t("candidates.import")}
        onChange={(event) => {
          void handleImport(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <Button variant="outline" onClick={() => inputRef.current?.click()}>
        <Upload aria-hidden />
        {t("candidates.import")}
      </Button>
      <Button variant="outline" onClick={() => downloadJson(exportData(), "cv-proof-export.json")}>
        <Download aria-hidden />
        {t("candidates.export")}
      </Button>
    </>
  );
}
