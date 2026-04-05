import type { Document } from "@/types";
import type { StateCreator } from "zustand";

export interface DocSlice {
  documents: Document[];
  fetchDocs: () => Promise<void>;
  setDocs: (docs: Document[]) => void;
}

export const createDocSlice: StateCreator<DocSlice> = (set) => ({
  documents: [],

  fetchDocs: async () => {
    const res = await fetch("/api/docs");
    const data = await res.json();
    set({ documents: data });
  },

  setDocs: (documents) => set({ documents }),
});
