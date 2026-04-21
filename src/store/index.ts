import { create } from "zustand";
import { createTaskSlice, type TaskSlice } from "./tasks";
import { createRiskSlice, type RiskSlice } from "./risks";
import { createLivrableSlice, type LivrableSlice } from "./livrables";
import { createEventSlice, type EventSlice } from "./events";
import { createMissionStateSlice, type MissionStateSlice } from "./mission-state";
import { createDocSlice, type DocSlice } from "./docs";
import { createScheduleSlice, type ScheduleSlice } from "./schedule";
import { createCorrectionSlice, type CorrectionSlice } from "./corrections";

export type StoreState = TaskSlice &
  RiskSlice &
  LivrableSlice &
  EventSlice &
  MissionStateSlice &
  DocSlice &
  ScheduleSlice &
  CorrectionSlice;

export const useStore = create<StoreState>()((...a) => ({
  ...createTaskSlice(...a),
  ...createRiskSlice(...a),
  ...createLivrableSlice(...a),
  ...createEventSlice(...a),
  ...createMissionStateSlice(...a),
  ...createDocSlice(...a),
  ...createScheduleSlice(...a),
  ...createCorrectionSlice(...a),
}));
