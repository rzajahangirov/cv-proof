import { toast } from "sonner";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { StateStorage } from "zustand/middleware";
import { translate } from "@/lib/i18n/core";
import { rescoreCandidate } from "@/lib/scoring";
import type { Candidate, ExportFile, HrDecision, Job, Lang } from "@/lib/types";

/** File objects cannot be persisted, so they only live for this page session. */
const fileRegistry = new Map<string, File>();

export function getFile(id: string): File | undefined {
  return fileRegistry.get(id);
}

export function createCandidate(id: string, fileName: string, lang: Lang): Candidate {
  return {
    id,
    fileName,
    step: "queued",
    error: null,
    cvText: "",
    profile: null,
    flags: { injectionDetected: false, injectionSnippets: [], githubError: null },
    stage1: null,
    github: null,
    modelScores: [],
    consensus: null,
    mergedClaims: [],
    interview: null,
    finalScore: null,
    verified: false,
    decision: null,
    hrDecision: null,
    lang,
  };
}

const IDLE_STEPS: Candidate["step"][] = ["queued", "done", "error"];

export function isRunning(candidate: Candidate): boolean {
  return !IDLE_STEPS.includes(candidate.step);
}

type StoreState = {
  job: Job | null;
  candidates: Candidate[];
  locale: Lang;
  hydrated: boolean;
  setJob: (job: Job) => void;
  addFiles: (files: File[]) => Candidate[];
  removeCandidate: (id: string) => void;
  updateCandidate: (id: string, patch: Partial<Candidate>) => void;
  setHrDecision: (id: string, decision: HrDecision | null) => void;
  setLocale: (locale: Lang) => void;
  reset: () => void;
  importData: (data: ExportFile) => void;
  exportData: () => ExportFile;
};

let warnedAboutStorage = false;

/** A full quota must not break a running analysis; state stays in memory. */
const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      if (!warnedAboutStorage) {
        warnedAboutStorage = true;
        toast.warning(translate(useStore.getState().locale, "errors.storage_full"));
      }
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      // Nothing to clean up if storage is unavailable.
    }
  },
};

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      job: null,
      candidates: [],
      locale: "az",
      hydrated: false,

      setJob: (job) =>
        set((state) => ({
          job,
          candidates: state.candidates.map((c) =>
            c.step === "done" ? rescoreCandidate(c, job) : c,
          ),
        })),

      addFiles: (files) => {
        const { candidates, locale } = get();
        const added = files.map((file) => {
          const id = crypto.randomUUID();
          fileRegistry.set(id, file);
          return createCandidate(id, file.name, locale);
        });
        set({ candidates: [...candidates, ...added] });
        return added;
      },

      removeCandidate: (id) => {
        fileRegistry.delete(id);
        set((state) => ({ candidates: state.candidates.filter((c) => c.id !== id) }));
      },

      updateCandidate: (id, patch) =>
        set((state) => ({
          candidates: state.candidates.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),

      setHrDecision: (id, hrDecision) => get().updateCandidate(id, { hrDecision }),

      setLocale: (locale) => set({ locale }),

      reset: () => {
        fileRegistry.clear();
        set({ job: null, candidates: [] });
      },

      importData: ({ job, candidates }) => {
        fileRegistry.clear();
        set({ job, candidates });
      },

      exportData: () => {
        const { job, candidates } = get();
        return { version: 1, job, candidates };
      },
    }),
    {
      name: "cv-screening-v1",
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      // Rehydrated from an effect, so the first client render matches the server.
      skipHydration: true,
      partialize: ({ job, candidates, locale }) => ({ job, candidates, locale }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<StoreState>;
        return {
          ...current,
          ...saved,
          // A reload kills in-flight requests; those candidates can only be retried.
          candidates: (saved.candidates ?? []).map((c) =>
            isRunning(c) ? { ...c, step: "error" as const, error: "interrupted" } : c,
          ),
          hydrated: true,
        };
      },
    },
  ),
);
