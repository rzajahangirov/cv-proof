"use client";

import { Check, ExternalLink, GitBranch, Minus, Star, TriangleAlert } from "lucide-react";
import { GithubCharts } from "@/components/candidate-detail/github-charts";
import { ClaimVerdictBadge } from "@/components/candidates/badges";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useT } from "@/lib/i18n";
import { errorKey } from "@/lib/i18n/core";
import type { MessageKey } from "@/lib/i18n/core";
import type { Candidate, MergedClaim, RepoEvidence } from "@/lib/types";

function noGithubReason(candidate: Candidate): MessageKey {
  if (candidate.flags.githubError) return errorKey(candidate.flags.githubError);
  if (candidate.github) return "detail.github.noRepos";
  if (candidate.stage1 && !candidate.stage1.passed) return "detail.github.notRun";
  return "detail.github.noUsername";
}

function ClaimMatrix({ claims, modelsOk }: { claims: MergedClaim[]; modelsOk: number }) {
  const t = useT();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("detail.github.claimsTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        {claims.length === 0 ? (
          <p className="text-muted-foreground">{t("detail.github.noClaims")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("detail.github.colClaim")}</TableHead>
                <TableHead>{t("detail.github.colVerdict")}</TableHead>
                <TableHead>{t("detail.github.colVotes")}</TableHead>
                <TableHead>{t("detail.github.colEvidence")}</TableHead>
                <TableHead>{t("detail.github.colLinks")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {claims.map((claim) => (
                <TableRow key={claim.claimId} className="align-top">
                  <TableCell className="max-w-64 font-medium whitespace-normal">
                    {claim.claim}
                  </TableCell>
                  <TableCell>
                    <ClaimVerdictBadge verdict={claim.verdict} />
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {t("detail.github.votes", {
                      count: claim.votes[claim.verdict],
                      total: modelsOk,
                    })}
                  </TableCell>
                  <TableCell className="max-w-96 whitespace-normal text-muted-foreground">
                    {claim.evidence[0] ?? t("common.notAvailable")}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {claim.links.map((link) => (
                        <a
                          key={link}
                          href={link}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={t("common.openOnGithub")}
                          className="text-primary hover:underline"
                        >
                          <ExternalLink className="size-4" aria-hidden />
                        </a>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function SignalBadge({ on, label }: { on: boolean; label: string }) {
  const Icon = on ? Check : Minus;
  return (
    <Badge variant={on ? "secondary" : "outline"} className={on ? "" : "text-muted-foreground"}>
      <Icon aria-hidden />
      {label}
    </Badge>
  );
}

function RepoCard({ repo }: { repo: RepoEvidence }) {
  const t = useT();
  const topLanguages = Object.keys(repo.languages).slice(0, 3);

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <a
            href={repo.url}
            target="_blank"
            rel="noreferrer"
            className="flex min-w-0 items-center gap-1.5 hover:underline"
          >
            <GitBranch className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{repo.name}</span>
          </a>
          <span className="flex shrink-0 items-center gap-1 text-sm font-normal text-muted-foreground">
            <Star className="size-3.5" aria-hidden />
            {t("detail.github.stars", { count: repo.stars })}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {repo.description && <p className="text-muted-foreground">{repo.description}</p>}
        <p className="tabular-nums text-muted-foreground">
          {t("detail.github.authorCommits", {
            author: repo.authorCommits,
            total: repo.totalCommits,
          })}
          {" · "}
          {t("detail.github.authorShare", { value: Math.round(repo.authorShare * 100) })}
          {" · "}
          {t("detail.github.activeDays", { count: repo.activeDays })}
        </p>
        <div className="flex flex-wrap gap-1">
          {topLanguages.map((language) => (
            <Badge key={language} variant="outline">
              {language}
            </Badge>
          ))}
          <SignalBadge on={repo.hasTests} label={t("detail.github.tests")} />
          <SignalBadge on={repo.hasCI} label={t("detail.github.ci")} />
          <SignalBadge on={repo.hasReadme} label={t("detail.github.readme")} />
        </div>
      </CardContent>
    </Card>
  );
}

export function GithubTab({ candidate }: { candidate: Candidate }) {
  const t = useT();
  const { github, consensus, mergedClaims } = candidate;

  return (
    <div className="space-y-4">
      {(!github || github.repos.length === 0) && (
        <Alert>
          <GitBranch aria-hidden />
          <AlertTitle>{t("detail.github.noGithubTitle")}</AlertTitle>
          <AlertDescription>{t(noGithubReason(candidate))}</AlertDescription>
        </Alert>
      )}

      {github && (
        <p className="text-sm text-muted-foreground">
          <a href={github.profileUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
            {t("detail.github.profile", { username: github.username })}
          </a>
          {" · "}
          {t("detail.github.stats", { own: github.ownRepos, forks: github.forkRepos })}
        </p>
      )}

      {github && github.redFlags.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900">
          <TriangleAlert aria-hidden />
          <AlertTitle>{t("detail.github.redFlagsTitle")}</AlertTitle>
          <AlertDescription className="text-amber-900">
            <p>{t("detail.github.redFlagsNote")}</p>
            <ul className="mt-1 space-y-1">
              {github.redFlags.map((flag) => (
                <li key={flag}>
                  <span className="font-medium">{t(`redFlag.${flag}`)}:</span>{" "}
                  {t(`redFlagHelp.${flag}`)}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {consensus && <ClaimMatrix claims={mergedClaims} modelsOk={consensus.modelsOk} />}

      {github && github.repos.length > 0 && (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">{t("detail.github.reposTitle")}</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {github.repos.map((repo) => (
                <RepoCard key={repo.name} repo={repo} />
              ))}
            </div>
          </section>
          <GithubCharts github={github} />
        </>
      )}
    </div>
  );
}
