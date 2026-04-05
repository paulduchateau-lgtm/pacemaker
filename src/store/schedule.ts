import type { ScheduleChange, ScheduleChangeType } from "@/types";
import type { StateCreator } from "zustand";

export interface ScheduleSlice {
  scheduleHistory: ScheduleChange[];
  fetchScheduleHistory: () => Promise<void>;
  changeWeekDate: (params: {
    weekId: number;
    newStartDate: string;
    cascade: boolean;
    changeType: ScheduleChangeType;
    reason: string;
  }) => Promise<void>;
  initializeWeekDates: (missionStartDate: string) => Promise<void>;
}

export const createScheduleSlice: StateCreator<ScheduleSlice> = (set) => ({
  scheduleHistory: [],

  fetchScheduleHistory: async () => {
    const res = await fetch("/api/data/schedule/history");
    const data = await res.json();
    set({ scheduleHistory: data });
  },

  changeWeekDate: async ({ weekId, newStartDate, cascade, changeType, reason }) => {
    await fetch("/api/data/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "change_date",
        weekId,
        newStartDate,
        cascade,
        changeType,
        reason,
      }),
    });
  },

  initializeWeekDates: async (missionStartDate: string) => {
    await fetch("/api/data/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "initialize",
        missionStartDate,
      }),
    });
  },
});
