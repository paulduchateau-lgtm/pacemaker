/**
 * Constantes Mission extraites pour être importables dans le middleware Edge
 * (où `@libsql/client` et donc `lib/mission.ts` complet ne peuvent pas tourner).
 */

export const DEFAULT_MISSION_SLUG = "agirc-arrco-2026";
export const ACTIVE_MISSION_COOKIE = "active_mission_slug";
