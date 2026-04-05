import type { Week } from "@/types";
import type { StateCreator } from "zustand";

export interface ProjectSlice {
  currentWeek: number;
  weeks: Week[];
  missionStartDate: string | null;
  jh_consommes: number;
  fetchProject: () => Promise<void>;
  setCurrentWeek: (week: number) => void;
  setWeeks: (weeks: Week[]) => void;
  setMissionStartDate: (date: string) => Promise<void>;
}

export const createProjectSlice: StateCreator<ProjectSlice> = (set) => ({
  currentWeek: 1,
  weeks: [],
  missionStartDate: null,
  jh_consommes: 0,

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
      missionStartDate: project.mission_start_date || null,
      jh_consommes: parseFloat(project.jh_consommes || "0"),
    });
  },

  setCurrentWeek: (week) => set({ currentWeek: week }),
  setWeeks: (weeks) => set({ weeks }),

  setMissionStartDate: async (date) => {
    await fetch("/api/data/project", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "mission_start_date", value: date }),
    });
    set({ missionStartDate: date });
  },
});
