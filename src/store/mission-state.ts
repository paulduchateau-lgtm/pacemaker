import type { Week } from "@/types";
import type { StateCreator } from "zustand";

/**
 * État-mission courant (semaine courante, planning, JH consommés, date de
 * démarrage). Renommé de `ProjectSlice` → `MissionStateSlice` au chantier 6 :
 * depuis le chantier 1 multi-tenant, ces données appartiennent à la mission
 * active, pas à un "project" global.
 */
export interface MissionStateSlice {
  currentWeek: number;
  weeks: Week[];
  missionStartDate: string | null;
  jh_consommes: number;
  fetchMissionState: () => Promise<void>;
  setCurrentWeek: (week: number) => void;
  setWeeks: (weeks: Week[]) => void;
  setMissionStartDate: (date: string) => Promise<void>;
}

export const createMissionStateSlice: StateCreator<MissionStateSlice> = (set) => ({
  currentWeek: 1,
  weeks: [],
  missionStartDate: null,
  jh_consommes: 0,

  fetchMissionState: async () => {
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
