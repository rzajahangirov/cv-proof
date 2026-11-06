"use client";

import { FolderOpen, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import type { DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function readEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => reader.readEntries(resolve, reject));
}

function fileFromEntry(entry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => entry.file(resolve, reject));
}

async function walk(entry: FileSystemEntry): Promise<File[]> {
  if (entry.isFile) return [await fileFromEntry(entry as FileSystemFileEntry)];

  const reader = (entry as FileSystemDirectoryEntry).createReader();
  const files: File[] = [];
  // readEntries returns results in batches, an empty batch ends the listing.
  for (let batch = await readEntries(reader); batch.length > 0; batch = await readEntries(reader)) {
    const nested = await Promise.all(batch.map(walk));
    files.push(...nested.flat());
  }
  return files;
}

async function filesFromDrop(event: DragEvent<HTMLDivElement>): Promise<File[]> {
  const entries = [...event.dataTransfer.items].flatMap((item) => item.webkitGetAsEntry() ?? []);
  const nested = await Promise.all(entries.map(walk));
  return nested.flat();
}

export function FilePicker({ onFiles }: { onFiles: (files: File[]) => void }) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  async function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    onFiles(await filesFromDrop(event));
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border-2 border-dashed p-10 text-center transition-colors",
        dragging ? "border-primary bg-primary/5" : "border-border",
      )}
    >
      <UploadCloud className="size-8 text-muted-foreground" aria-hidden />
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        aria-label={t("upload.pickFolder")}
        {...{ webkitdirectory: "", directory: "" }}
        onChange={(event) => {
          onFiles([...(event.target.files ?? [])]);
          event.target.value = "";
        }}
      />
      <Button size="lg" onClick={() => inputRef.current?.click()}>
        <FolderOpen aria-hidden />
        {t("upload.pickFolder")}
      </Button>
      <p className="text-sm text-muted-foreground">{t("upload.dropHint")}</p>
    </div>
  );
}
