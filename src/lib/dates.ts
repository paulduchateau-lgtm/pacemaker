import type { Week, Phase } from "@/types";
import { PHASE_WEEKS } from "@/config/phases";

const DAYS_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const MONTHS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const MONTHS_SHORT = ["jan.", "fév.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

export function formatTodayFr(): string {
  const d = new Date();
  return `${DAYS_FR[d.getDay()]} ${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateFr(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateShort(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export function computeWeekDates(
  missionStart: string,
  weekIndex: number
): { startDate: string; endDate: string } {
  const startDate = addDays(missionStart, weekIndex * 7);
  const endDate = addDays(startDate, 4); // du lundi au vendredi
  return { startDate, endDate };
}

export function computeAllWeekDates(
  missionStart: string,
  weekCount: number = 7
): Array<{ startDate: string; endDate: string }> {
  return Array.from({ length: weekCount }, (_, i) =>
    computeWeekDates(missionStart, i)
  );
}

export function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA + "T00:00:00");
  const b = new Date(dateB + "T00:00:00");
  return Math.round((b.getTime() - a.getTime()) / (86400 * 1000));
}

export function computeDelta(baselineEnd: string, actualEnd: string): number {
  return daysBetween(baselineEnd, actualEnd);
}

export function computePhaseDelta(weeks: Week[], phase: Phase): number {
  const weekIds = PHASE_WEEKS[phase] || [];
  const phaseWeeks = weeks.filter(
    (w) => weekIds.includes(w.id) && w.startDate && w.endDate
  );
  if (phaseWeeks.length === 0) return 0;
  const lastWeek = phaseWeeks[phaseWeeks.length - 1];
  if (!lastWeek.endDate || !lastWeek.baselineEndDate) return 0;
  return computeDelta(lastWeek.baselineEndDate, lastWeek.endDate);
}

export function computeGlobalDelta(weeks: Week[]): number {
  const last = weeks[weeks.length - 1];
  if (!last?.endDate || !last?.baselineEndDate) return 0;
  return computeDelta(last.baselineEndDate, last.endDate);
}

export function formatDeltaLabel(delta: number): string {
  if (delta < 0) return `en avance de ${Math.abs(delta)} j`;
  if (delta > 0) return `en retard de ${delta} j`;
  return "dans les temps";
}
