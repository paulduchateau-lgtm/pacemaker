import type { Week } from "@/types";
import type { StateCreator } from "zustand";

export interface ProjectSlice {
  currentWeek: number;
  weeks: Week[];
  fetchProject: () => Promise<void>;
  setCurrentWeek: (week: number) => void;
  setWeeks: (weeks: Week[]) => void;
}

export const createProjectSlice: StateCreator<ProjectSlice> = (set) => ({
  currentWeek: 1,
  weeks: [],

  fetchProject: async () => {
    const [weeksRes, projectRes] = await Promise.all([
      fetch("/api/data/weeks"),
      fetch("/api/data/project"),
    ]);
    const weeks = await weeksRes.json();
    const project = await projectRes.json();
    set({
      weeks,
      currentWeek: parseInt(project.current_week || "1", 10),
    });
  },

  setCurrentWeek: (week) => set({ currentWeek: week }),
  setWeeks: (weeks) => set({ weeks }),
});
