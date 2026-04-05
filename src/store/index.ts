import { create } from "zustand";
import { createTaskSlice, type TaskSlice } from "./tasks";
import { createRiskSlice, type RiskSlice } from "./risks";
import { createLivrableSlice, type LivrableSlice } from "./livrables";
import { createEventSlice, type EventSlice } from "./events";
import { createProjectSlice, type ProjectSlice } from "./project";
import { createDocSlice, type DocSlice } from "./docs";
import { createScheduleSlice, type ScheduleSlice } from "./schedule";

export type StoreState = TaskSlice &
  RiskSlice &
  LivrableSlice &
  EventSlice &
  ProjectSlice &
  DocSlice &
  ScheduleSlice;

export const useStore = create<StoreState>()((...a) => ({
  ...createTaskSlice(...a),
  ...createRiskSlice(...a),
  ...createLivrableSlice(...a),
  ...createEventSlice(...a),
  ...createProjectSlice(...a),
  ...createDocSlice(...a),
  ...createScheduleSlice(...a),
}));
