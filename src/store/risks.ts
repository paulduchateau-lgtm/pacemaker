import type { Risk, RiskStatus } from "@/types";
import type { StateCreator } from "zustand";

export interface RiskSlice {
  risks: Risk[];
  fetchRisks: () => Promise<void>;
  addRisk: (risk: Omit<Risk, "id">) => Promise<void>;
  updateRiskStatus: (id: string, status: RiskStatus) => Promise<void>;
  setRisks: (risks: Risk[]) => void;
}

export const createRiskSlice: StateCreator<RiskSlice> = (set) => ({
  risks: [],

  fetchRisks: async () => {
    const res = await fetch("/api/data/risks");
    const data = await res.json();
    set({ risks: data });
  },

  addRisk: async (risk) => {
    const res = await fetch("/api/data/risks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(risk),
    });
    const created = await res.json();
    set((state) => ({ risks: [...state.risks, created] }));
  },

  updateRiskStatus: async (id, status) => {
    await fetch("/api/data/risks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    set((state) => ({
      risks: state.risks.map((r) => (r.id === id ? { ...r, status } : r)),
    }));
  },

  setRisks: (risks) => set({ risks }),
});
