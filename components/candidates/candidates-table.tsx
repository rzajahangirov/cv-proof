"use client";

import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { DecisionBadge, FlagIcons } from "@/components/candidates/badges";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useT } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n/core";
import type { Candidate } from "@/lib/types";

type Row = Candidate & { rank: number };

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric },
});

const helper = createColumnHelper<typeof features, Row>();

function Header({ label }: { label: MessageKey }) {
  return useT()(label);
}

function CandidateCell({ candidate }: { candidate: Row }) {
  const t = useT();
  return (
    <div className="min-w-0">
      <Link href={`/candidates/${candidate.id}`} className="font-medium hover:underline">
        {candidate.profile?.name ?? t("candidates.unknownName")}
      </Link>
      <p className="truncate text-sm text-muted-foreground">{candidate.fileName}</p>
    </div>
  );
}

function ScoreCell({ value }: { value: number | null }) {
  const t = useT();
  return <span className="tabular-nums">{value ?? t("common.notAvailable")}</span>;
}

function GithubCell({ candidate }: { candidate: Row }) {
  const t = useT();
  if (!candidate.consensus) return <span>{t("common.notAvailable")}</span>;
  return (
    <span className="tabular-nums">
      {candidate.consensus.mean}
      <span className="text-muted-foreground"> ± {candidate.consensus.spread}</span>
    </span>
  );
}

function DecisionCell({ candidate }: { candidate: Row }) {
  const t = useT();
  if (candidate.step === "error") {
    return <span className="text-sm text-red-700">{t("step.error")}</span>;
  }
  if (candidate.step !== "done") {
    return <span className="text-sm text-muted-foreground">{t("candidates.inProgress")}</span>;
  }
  return <DecisionBadge decision={candidate.decision} />;
}

const columns = helper.columns([
  helper.accessor("rank", {
    header: () => <Header label="candidates.colRank" />,
    cell: (info) => <span className="tabular-nums text-muted-foreground">{info.getValue()}</span>,
  }),
  helper.accessor((row) => row.profile?.name ?? row.fileName, {
    id: "name",
    header: () => <Header label="candidates.colName" />,
    cell: (info) => <CandidateCell candidate={info.row.original} />,
  }),
  helper.accessor((row) => row.stage1?.score ?? -1, {
    id: "cv",
    header: () => <Header label="candidates.colCv" />,
    cell: (info) => <ScoreCell value={info.row.original.stage1?.score ?? null} />,
  }),
  helper.accessor((row) => row.consensus?.mean ?? -1, {
    id: "github",
    header: () => <Header label="candidates.colGithub" />,
    cell: (info) => <GithubCell candidate={info.row.original} />,
  }),
  helper.accessor((row) => row.finalScore ?? -1, {
    id: "final",
    header: () => <Header label="candidates.colFinal" />,
    cell: (info) => (
      <span className="font-semibold">
        <ScoreCell value={info.row.original.finalScore} />
      </span>
    ),
  }),
  helper.accessor((row) => row.decision ?? "", {
    id: "decision",
    header: () => <Header label="candidates.colDecision" />,
    cell: (info) => <DecisionCell candidate={info.row.original} />,
  }),
  helper.display({
    id: "flags",
    header: () => <Header label="candidates.colFlags" />,
    cell: (info) => <FlagIcons candidate={info.row.original} />,
  }),
]);

/** Rejected candidates rank last even if a knockout left them with a high score. */
export function rankCandidates(candidates: Candidate[]): Row[] {
  return [...candidates]
    .sort(
      (a, b) =>
        Number(a.decision === "rejected") - Number(b.decision === "rejected") ||
        (b.finalScore ?? -1) - (a.finalScore ?? -1),
    )
    .map((candidate, index) => ({ ...candidate, rank: index + 1 }));
}

export function CandidatesTable({ rows }: { rows: Row[] }) {
  const t = useT();
  const router = useRouter();
  const data = useMemo(() => rows, [rows]);

  const table = useTable({
    features,
    columns,
    data,
    getRowId: (row) => row.id,
    initialState: { sorting: [{ id: "rank", desc: false }] },
  });

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => {
                const sorted = header.column.getIsSorted();
                const canSort = header.column.getCanSort();
                return (
                  <TableHead key={header.id}>
                    {canSort ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        <table.FlexRender header={header} />
                        {sorted === "asc" && <ArrowUp className="size-3.5" aria-hidden />}
                        {sorted === "desc" && <ArrowDown className="size-3.5" aria-hidden />}
                        {!sorted && <ChevronsUpDown className="size-3.5 opacity-40" aria-hidden />}
                      </button>
                    ) : (
                      <table.FlexRender header={header} />
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                {t("candidates.noResults")}
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer"
                onClick={() => router.push(`/candidates/${row.id}`)}
              >
                {row.getAllCells().map((cell) => (
                  <TableCell key={cell.id}>
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
