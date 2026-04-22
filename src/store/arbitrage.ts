import { create } from "zustand";
import type { PlanImpact } from "@/types";

interface ArbitrageState {
  pendingCount: number;
  pendingImpacts: PlanImpact[];
  loadPendingImpacts: (slug: string) => Promise<void>;
  acceptImpact: (id: string, slug: string) => Promise<void>;
  rejectImpact: (id: string, slug: string, rationale?: string) => Promise<void>;
  setPendingCount: (n: number) => void;
}

export const useArbitrageStore = create<ArbitrageState>((set) => ({
  pendingCount: 0,
  pendingImpacts: [],

  setPendingCount: (n) => set({ pendingCount: n }),

  loadPendingImpacts: async (slug) => {
    const res = await fetch(
      `/api/impacts?status=proposed,modified&mission=${slug}`,
    );
    if (!res.ok) return;
    const data = await res.json();
    const impacts: PlanImpact[] = Array.isArray(data) ? data : [];
    set({ pendingImpacts: impacts, pendingCount: impacts.length });
  },

  acceptImpact: async (id, slug) => {
    const res = await fetch(`/api/impacts/${id}/accept`, { method: "POST", headers: { "Content-Type": "application/json", "x-mission-slug": slug }, body: JSON.stringify({}) });
    if (!res.ok) throw new Error("Echec de l'acceptation");
    set((s) => ({
      pendingImpacts: s.pendingImpacts.filter((i) => i.id !== id),
      pendingCount: Math.max(0, s.pendingCount - 1),
    }));
  },

  rejectImpact: async (id, slug, rationale) => {
    const res = await fetch(`/api/impacts/${id}/reject`, { method: "POST", headers: { "Content-Type": "application/json", "x-mission-slug": slug }, body: JSON.stringify({ rationale }) });
    if (!res.ok) throw new Error("Echec du rejet");
    set((s) => ({
      pendingImpacts: s.pendingImpacts.filter((i) => i.id !== id),
      pendingCount: Math.max(0, s.pendingCount - 1),
    }));
  },
}));
