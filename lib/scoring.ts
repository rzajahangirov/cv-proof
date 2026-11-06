import { config } from "@/lib/config";
import type {
  Candidate,
  ClaimVerdict,
  Consensus,
  Criterion,
  Decision,
  Job,
  MergedClaim,
  ModelScore,
  Stage1Result,
  Verdict,
} from "@/lib/types";

/** Stage 1 numbers are always computed here, never by an LLM (plan §5). */
export function computeStage1(
  criteria: Criterion[],
  verdicts: { criterionId: string; verdict: Verdict }[],
  threshold: number,
): Pick<Stage1Result, "score" | "knockout" | "passed"> {
  const byId = new Map(verdicts.map((v) => [v.criterionId, v.verdict]));
  let weighted = 0;
  let totalWeight = 0;
  let knockout = false;

  for (const criterion of criteria) {
    const verdict = byId.get(criterion.id) ?? "missing";
    weighted += criterion.weight * config.scoring.verdictValue[verdict];
    totalWeight += criterion.weight;
    if (criterion.type === "must" && verdict === "missing") knockout = true;
  }

  const score = totalWeight === 0 ? 0 : Math.round((100 * weighted) / totalWeight);
  return { score, knockout, passed: !knockout && score >= threshold };
}

/** Returns null when no model succeeded: there is nothing to agree on. */
export function computeConsensus(modelScores: ModelScore[]): Consensus | null {
  const scores = modelScores.flatMap((m) => (m.ok && m.score !== null ? [m.score] : []));
  if (scores.length === 0) return null;

  const mean = Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
  const spread = Math.max(...scores) - Math.min(...scores);
  return {
    mean,
    spread,
    needsReview: spread > config.scoring.spreadLimit,
    modelsOk: scores.length,
    modelsTotal: modelScores.length,
  };
}

/** Best to worst. A tied vote resolves to the verdict closest to the end. */
const CLAIM_VERDICT_ORDER: ClaimVerdict[] = ["confirmed", "partial", "no_evidence", "contradicted"];

export function mergeClaims(
  claims: { id: string; claim: string }[],
  modelScores: ModelScore[],
): MergedClaim[] {
  const okModels = modelScores.filter((m) => m.ok);

  return claims.map(({ id, claim }) => {
    const votes: Record<ClaimVerdict, number> = {
      confirmed: 0,
      partial: 0,
      no_evidence: 0,
      contradicted: 0,
    };
    const evidence: string[] = [];
    const links = new Set<string>();

    for (const model of okModels) {
      const entry = model.claims.find((c) => c.claimId === id);
      if (!entry) continue;
      votes[entry.verdict] += 1;
      if (entry.evidence) evidence.push(entry.evidence);
      if (entry.link) links.add(entry.link);
    }

    const top = Math.max(...Object.values(votes));
    const verdict =
      top === 0
        ? "no_evidence"
        : ([...CLAIM_VERDICT_ORDER].reverse().find((v) => votes[v] === top) ?? "no_evidence");

    return { claimId: id, claim, verdict, votes, evidence, links: [...links] };
  });
}

/** True only when GitHub produced something the ensemble actually scored. */
export function hasGithubEvidence(c: Pick<Candidate, "github" | "consensus">): boolean {
  return c.github !== null && c.consensus !== null;
}

export function computeFinal(
  c: Pick<Candidate, "stage1" | "github" | "consensus">,
  job: Pick<Job, "cvWeight">,
): { finalScore: number | null; verified: boolean } {
  if (!c.stage1) return { finalScore: null, verified: false };
  if (!hasGithubEvidence(c) || !c.consensus) {
    return { finalScore: c.stage1.score, verified: false };
  }
  const finalScore = Math.round(
    job.cvWeight * c.stage1.score + (1 - job.cvWeight) * c.consensus.mean,
  );
  return { finalScore, verified: true };
}

/** First match wins (plan §5). */
export function decide(
  c: Pick<Candidate, "flags" | "stage1" | "github" | "consensus">,
  finalScore: number | null,
  job: Pick<Job, "recommendThreshold">,
): Decision | null {
  if (!c.stage1) return null;
  if (c.flags.injectionDetected) return "needs_review";
  if (!c.stage1.passed) return "rejected";
  if (c.consensus?.needsReview) return "needs_review";
  if (!hasGithubEvidence(c)) return "manual_review";
  if (finalScore !== null && finalScore >= job.recommendThreshold) return "recommended";
  return "consider";
}

export function finalize(
  c: Pick<Candidate, "flags" | "stage1" | "github" | "consensus">,
  job: Pick<Job, "cvWeight" | "recommendThreshold">,
): Pick<Candidate, "finalScore" | "verified" | "decision"> {
  const { finalScore, verified } = computeFinal(c, job);
  return { finalScore, verified, decision: decide(c, finalScore, job) };
}

/**
 * Re-applies the deterministic rules after HR edits thresholds, weights or
 * criteria. Stored verdicts are kept; criteria that were never evaluated do
 * not count against the candidate. With no overlap at all (the criteria were
 * regenerated) there is nothing to recompute from, so the result stays as it is.
 */
export function rescoreCandidate(c: Candidate, job: Job): Candidate {
  if (!c.stage1) return c;
  const evaluated = new Set(c.stage1.criteria.map((v) => v.criterionId));
  const criteria = job.criteria.filter((criterion) => evaluated.has(criterion.id));
  if (criteria.length === 0) return c;
  const stage1 = { ...c.stage1, ...computeStage1(criteria, c.stage1.criteria, job.threshold) };
  const next = { ...c, stage1 };
  return { ...next, ...finalize(next, job) };
}
