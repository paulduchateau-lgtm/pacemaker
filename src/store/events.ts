import type { MissionEvent } from "@/types";
import type { StateCreator } from "zustand";

export interface EventSlice {
  events: MissionEvent[];
  fetchEvents: () => Promise<void>;
  setEvents: (events: MissionEvent[]) => void;
}

export const createEventSlice: StateCreator<EventSlice> = (set) => ({
  events: [],

  fetchEvents: async () => {
    const res = await fetch("/api/data/events");
    const data = await res.json();
    set({ events: data });
  },

  setEvents: (events) => set({ events }),
});
