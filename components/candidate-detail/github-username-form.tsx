"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeGithubUsername } from "@/lib/github/username";
import { useT } from "@/lib/i18n";
import { changeGithubUsername } from "@/lib/pipeline/runner";
import type { Candidate } from "@/lib/types";

export function GithubUsernameForm({ candidate }: { candidate: Candidate }) {
  const t = useT();
  const [value, setValue] = useState(candidate.profile?.githubUsername ?? "");

  function submit(event: FormEvent) {
    event.preventDefault();
    const username = normalizeGithubUsername(value);
    if (!username) return void toast.error(t("detail.github.invalidUsername"));
    changeGithubUsername(candidate.id, username);
  }

  return (
    <form onSubmit={submit} className="space-y-1.5 rounded-lg border p-3">
      <label htmlFor="github-username" className="text-sm font-medium">
        {t("detail.github.usernameLabel")}
      </label>
      <div className="flex max-w-md gap-2">
        <Input
          id="github-username"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={t("detail.github.usernamePlaceholder")}
        />
        <Button type="submit" variant="outline">
          <Search aria-hidden />
          {t("detail.github.usernameCheck")}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">{t("detail.github.usernameHint")}</p>
    </form>
  );
}
