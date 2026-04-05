import type { Correction, GenerationType } from "@/types";
import type { StateCreator } from "zustand";

export interface CorrectionSlice {
  corrections: Correction[];
  rulesStats: { total: number; applications: number };
  fetchCorrections: (type?: GenerationType) => Promise<void>;
  fetchRulesStats: () => Promise<void>;
  submitCorrection: (generationId: string, correctedOutput: string) => Promise<{ ruleLearned: string }>;
  archiveRule: (id: string) => Promise<void>;
}

export const createCorrectionSlice: StateCreator<CorrectionSlice> = (set, get) => ({
  corrections: [],
  rulesStats: { total: 0, applications: 0 },

  fetchCorrections: async (type) => {
    const url = type ? `/api/corrections?type=${type}` : "/api/corrections";
    const res = await fetch(url);
    const data = await res.json();
    set({ corrections: data });
  },

  fetchRulesStats: async () => {
    const res = await fetch("/api/corrections/stats");
    const data = await res.json();
    set({ rulesStats: data });
  },

  submitCorrection: async (generationId, correctedOutput) => {
    const res = await fetch("/api/corrections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ generationId, correctedOutput }),
    });
    const data = await res.json();
    await get().fetchRulesStats();
    return data;
  },

  archiveRule: async (id) => {
    await fetch(`/api/corrections/${id}`, { method: "DELETE" });
    set({
      corrections: get().corrections.filter((c) => c.id !== id),
    });
    await get().fetchRulesStats();
  },
});
