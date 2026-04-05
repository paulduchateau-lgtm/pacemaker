import type { Livrable, LivrableStatus } from "@/types";
import type { StateCreator } from "zustand";

export interface LivrableSlice {
  livrables: Livrable[];
  fetchLivrables: () => Promise<void>;
  updateLivrableStatus: (id: string, status: LivrableStatus) => Promise<void>;
  setLivrables: (livrables: Livrable[]) => void;
}

export const createLivrableSlice: StateCreator<LivrableSlice> = (set) => ({
  livrables: [],

  fetchLivrables: async () => {
    const res = await fetch("/api/data/livrables");
    const data = await res.json();
    set({ livrables: data });
  },

  updateLivrableStatus: async (id, status) => {
    await fetch("/api/data/livrables", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    set((state) => ({
      livrables: state.livrables.map((l) =>
        l.id === id ? { ...l, status } : l
      ),
    }));
  },

  setLivrables: (livrables) => set({ livrables }),
});
