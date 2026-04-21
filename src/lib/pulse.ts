import { query } from "./db";

/**
 * Vue "Pulse" — agrégation pour comprendre la dynamique humaine et les
 * bascules du projet. Feature inspirée du prototype Claude Design
 * (docs/design/pacemaker-prototype/SPEC.md §5).
 *
 * Sources de données utilisées :
 *  - decisions (auteur, status, acted_at) → pivots si major
 *  - events (type, label, date) → timeline générale
 *  - recalibrations (scope, trigger, created_at) → pivot si full_plan
 *  - incoherences (severity, kind, created_at) → pivot si major
 *  - plaud_signals (kind, intensity, subject) → satisfaction par stakeholder
 */

export type StakeholderTrend = "up" | "down" | "flat";
export type PulseEventTone = "pos" | "neu" | "neg";
export type PulseEventKind =
  | "decision" | "recalib" | "incoherence" | "plaud" | "upload" | "vision" | "event";

export interface Stakeholder {
  /** Identifiant stable, dérivé du subject des plaud_signals ou de l'auteur. */
  id: string;
  name: string;
  /** Role libellé ; vide si inconnu. */
  role: string;
  /** Satisfaction ∈ [0,1], calculée depuis les signaux Plaud récents. */
  sat: number;
  /** Tendance vs la semaine précédente. */
  trend: StakeholderTrend;
  /** Nb d'interactions captées sur la mission. */
  interactions: number;
}

export interface PulseEvent {
  id: string;
  t: string;                  // ISO date
  kind: PulseEventKind;
  label: string;
  tone: PulseEventTone;
  subject: string | null;
  /** Est-ce une "bascule" ? */
  pivot: boolean;
  pivotReason: string | null;
  /** ID source (decision-id, recalib-id, etc.) pour deep-link. */
  refId: string;
}

export interface SignalMixBucket {
  label: "Positifs" | "Neutres" | "Négatifs" | "Bascules";
  count: number;
}

export interface Insight {
  id: string;
  tone: "pos" | "neu" | "neg";
  icon: "flag" | "warn" | "heart";
  label: string;
  title: string;
  body: string;
  rule: string;
  action: string;
}

export interface MoodPoint {
  day: string;                // ISO yyyy-mm-dd
  pos: number;
  neu: number;
  neg: number;
}

export interface PulseData {
  stakeholders: Stakeholder[];
  events: PulseEvent[];
  pivots: PulseEvent[];
  signalMix: SignalMixBucket[];
  /** Score global 0..1, moyenne pondérée de la satisfaction stakeholders. */
  moodScore: number;
  /** Delta moodScore sur 7 jours (négatif = dégradation). */
  moodDelta: number;
  /** Série 14 jours : pour chaque jour, comptage pos/neu/neg. */
  moodSeries: MoodPoint[];
  /** Insights auto-détectés (règles simples). */
  insights: Insight[];
  windowStart: string;
  windowEnd: string;
}

const POS_KINDS = new Set(["satisfaction"]);
const NEG_KINDS = new Set(["frustration", "tension"]);
const NEU_KINDS = new Set(["uncertainty", "posture_shift"]);

function computeSatFromSignals(
  signalRows: Array<{ kind: string; intensity: string }>,
): number {
  if (signalRows.length === 0) return 0.5; // neutral default
  const weight = (i: string) => (i === "strong" ? 1 : i === "moderate" ? 0.6 : 0.3);
  let pos = 0, neg = 0;
  for (const s of signalRows) {
    const w = weight(s.intensity);
    if (POS_KINDS.has(s.kind)) pos += w;
    else if (NEG_KINDS.has(s.kind)) neg += w;
    // neutral kinds : ignored
  }
  const total = pos + neg;
  if (total === 0) return 0.5;
  return Math.max(0, Math.min(1, pos / total));
}

function trendFromHistory(
  recent: number,
  prior: number,
): StakeholderTrend {
  const diff = recent - prior;
  if (diff > 0.1) return "up";
  if (diff < -0.1) return "down";
  return "flat";
}

type Row = Record<string, unknown>;

async function safeQuery(sql: string, args: unknown[]): Promise<Row[]> {
  try {
    return (await query(sql, args as Parameters<typeof query>[1])) as Row[];
  } catch {
    return [];
  }
}

/**
 * Calcule les stakeholders à partir des plaud_signals (subject non null)
 * + des decisions.author + des tasks.owner. Retourne 0..N stakeholders
 * avec satisfaction et trend.
 */
async function computeStakeholders(missionId: string): Promise<Stakeholder[]> {
  // Subjects depuis plaud_signals (chantier 5) : c'est la meilleure source.
  const sigRows = await safeQuery(
    `SELECT subject, kind, intensity, created_at FROM plaud_signals
     WHERE mission_id = ? AND subject IS NOT NULL AND subject != ''`,
    [missionId],
  );

  // Fallback additionnel : owners de tasks + auteurs de decisions
  const ownerRows = await safeQuery(
    `SELECT DISTINCT owner AS subject FROM tasks WHERE mission_id = ? AND owner IS NOT NULL`,
    [missionId],
  );
  const authorRows = await safeQuery(
    `SELECT DISTINCT author AS subject FROM decisions WHERE mission_id = ? AND author IS NOT NULL`,
    [missionId],
  );

  const subjects = new Map<string, { name: string; role: string; signals: Row[] }>();
  const putSubject = (raw: unknown, role: string) => {
    if (!raw) return;
    const key = String(raw).trim().toLowerCase();
    if (!key) return;
    if (!subjects.has(key)) {
      subjects.set(key, { name: prettifyName(String(raw)), role, signals: [] });
    }
  };

  for (const r of sigRows) putSubject(r.subject, roleFromSubject(String(r.subject)));
  for (const r of ownerRows) putSubject(r.subject, "Équipe mission");
  for (const r of authorRows) putSubject(r.subject, "Décideur");

  // Attach signals
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 3600 * 1000;
  const fourteenDaysAgo = now - 14 * 24 * 3600 * 1000;

  for (const sig of sigRows) {
    const key = String(sig.subject).trim().toLowerCase();
    subjects.get(key)?.signals.push(sig);
  }

  const out: Stakeholder[] = [];
  Array.from(subjects.entries()).forEach(([id, s]) => {
    const recentSignals = s.signals.filter(
      (x) => new Date(String(x.created_at)).getTime() > sevenDaysAgo,
    );
    const priorSignals = s.signals.filter((x) => {
      const t = new Date(String(x.created_at)).getTime();
      return t > fourteenDaysAgo && t <= sevenDaysAgo;
    });
    const sat = computeSatFromSignals(
      recentSignals.map((x) => ({ kind: String(x.kind), intensity: String(x.intensity) })),
    );
    const prior = computeSatFromSignals(
      priorSignals.map((x) => ({ kind: String(x.kind), intensity: String(x.intensity) })),
    );
    out.push({
      id,
      name: s.name,
      role: s.role,
      sat,
      trend: trendFromHistory(sat, prior),
      interactions: s.signals.length,
    });
  });

  // Tri : sponsors/décideurs d'abord puis par satisfaction décroissante
  out.sort((a, b) => {
    const roleA = /sponsor|décideur/i.test(a.role) ? 0 : 1;
    const roleB = /sponsor|décideur/i.test(b.role) ? 0 : 1;
    if (roleA !== roleB) return roleA - roleB;
    return b.interactions - a.interactions;
  });

  return out;
}

function prettifyName(raw: string): string {
  // "paul_b" → "Paul B.", "client" → "Client", "Benoît Baret" → "Benoît Baret"
  if (/^[a-z_]+$/.test(raw)) {
    return raw
      .split("_")
      .map((p) => p[0]?.toUpperCase() + p.slice(1))
      .join(" ")
      .replace(/\b(B|D|M|P|L|R)\b/g, "$1.");
  }
  return raw;
}

function roleFromSubject(raw: string): string {
  const s = raw.toLowerCase();
  if (s === "client") return "Client";
  if (s.startsWith("paul")) return "Équipe mission";
  if (s === "team") return "Équipe projet";
  return "Stakeholder";
}

async function computeEvents(missionId: string): Promise<{ events: PulseEvent[]; pivots: PulseEvent[] }> {
  const [decRows, recalibRows, incRows, sigRows, evtRows] = await Promise.all([
    safeQuery(
      `SELECT id, statement, author, status, acted_at FROM decisions
       WHERE mission_id = ? ORDER BY acted_at DESC LIMIT 50`,
      [missionId],
    ),
    safeQuery(
      `SELECT id, scope, trigger, changes_summary, created_at FROM recalibrations
       WHERE mission_id = ? AND reverted_at IS NULL ORDER BY created_at DESC LIMIT 30`,
      [missionId],
    ),
    safeQuery(
      `SELECT id, kind, severity, description, created_at FROM incoherences
       WHERE mission_id = ? ORDER BY created_at DESC LIMIT 30`,
      [missionId],
    ),
    safeQuery(
      `SELECT id, kind, intensity, subject, content, created_at FROM plaud_signals
       WHERE mission_id = ? ORDER BY created_at DESC LIMIT 50`,
      [missionId],
    ),
    safeQuery(
      `SELECT id, type, label, date, content FROM events
       WHERE mission_id = ? ORDER BY date DESC LIMIT 50`,
      [missionId],
    ),
  ]);

  const events: PulseEvent[] = [];

  for (const r of decRows) {
    const status = String(r.status);
    events.push({
      id: String(r.id),
      t: String(r.acted_at),
      kind: "decision",
      label: `Décision : ${String(r.statement).slice(0, 90)}`,
      tone: status === "actée" ? "pos" : status === "révisée" ? "neu" : "neu",
      subject: (r.author as string | null) ?? null,
      pivot: false,
      pivotReason: null,
      refId: String(r.id),
    });
  }

  for (const r of recalibRows) {
    const scope = String(r.scope);
    const isPivot = scope === "full_plan";
    events.push({
      id: `recalib-${r.id}`,
      t: String(r.created_at),
      kind: "recalib",
      label: `Recalibration ${String(r.trigger)} (${scope})`,
      tone: "neu",
      subject: null,
      pivot: isPivot,
      pivotReason: isPivot
        ? `Plan complet recalibré — ${String(r.changes_summary ?? "").slice(0, 120)}`
        : null,
      refId: String(r.id),
    });
  }

  for (const r of incRows) {
    const severity = String(r.severity);
    const isPivot = severity === "major";
    events.push({
      id: `inc-${r.id}`,
      t: String(r.created_at),
      kind: "incoherence",
      label: `Incohérence ${String(r.kind)} (${severity}) : ${String(r.description).slice(0, 80)}`,
      tone: "neg",
      subject: null,
      pivot: isPivot,
      pivotReason: isPivot
        ? `Contradiction majeure détectée — ${String(r.description).slice(0, 120)}`
        : null,
      refId: String(r.id),
    });
  }

  for (const r of sigRows) {
    const kind = String(r.kind);
    const tone: PulseEventTone = POS_KINDS.has(kind)
      ? "pos"
      : NEG_KINDS.has(kind)
      ? "neg"
      : NEU_KINDS.has(kind)
      ? "neu"
      : "neu";
    const intensity = String(r.intensity);
    const isPivot = intensity === "strong" && (kind === "tension" || kind === "frustration" || kind === "posture_shift");
    events.push({
      id: `sig-${r.id}`,
      t: String(r.created_at),
      kind: "plaud",
      label: `Signal Plaud [${intensity}/${kind}] ${String(r.content).slice(0, 90)}`,
      tone,
      subject: (r.subject as string | null) ?? null,
      pivot: isPivot,
      pivotReason: isPivot
        ? `Signal ${kind} intense capté sur ${String(r.subject ?? "—")}`
        : null,
      refId: String(r.id),
    });
  }

  for (const r of evtRows) {
    const type = String(r.type);
    if (type === "recalib") continue; // déjà couvert par recalibRows
    events.push({
      id: `evt-${r.id}`,
      t: String(r.date),
      kind: type === "vision" ? "vision" : type === "upload" ? "upload" : "event",
      label: String(r.label),
      tone: "neu",
      subject: null,
      pivot: false,
      pivotReason: null,
      refId: String(r.id),
    });
  }

  events.sort((a, b) => a.t.localeCompare(b.t));
  const pivots = events.filter((e) => e.pivot);
  return { events, pivots };
}

function computeSignalMix(events: PulseEvent[]): SignalMixBucket[] {
  const pos = events.filter((e) => e.tone === "pos" && !e.pivot).length;
  const neu = events.filter((e) => e.tone === "neu" && !e.pivot).length;
  const neg = events.filter((e) => e.tone === "neg" && !e.pivot).length;
  const pivots = events.filter((e) => e.pivot).length;
  return [
    { label: "Positifs", count: pos },
    { label: "Neutres", count: neu },
    { label: "Négatifs", count: neg },
    { label: "Bascules", count: pivots },
  ];
}

function computeMoodSeries(events: PulseEvent[]): MoodPoint[] {
  // 14 derniers jours glissants.
  const now = Date.now();
  const dayMs = 24 * 3600 * 1000;
  const days: MoodPoint[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now - i * dayMs);
    const key = d.toISOString().slice(0, 10);
    days.push({ day: key, pos: 0, neu: 0, neg: 0 });
  }
  const byDay = new Map(days.map((d) => [d.day, d]));
  for (const e of events) {
    const key = e.t.slice(0, 10);
    const bucket = byDay.get(key);
    if (!bucket) continue;
    if (e.tone === "pos") bucket.pos++;
    else if (e.tone === "neg") bucket.neg++;
    else bucket.neu++;
  }
  return days;
}

function computeMoodScore(stakeholders: Stakeholder[]): { score: number; delta: number } {
  if (stakeholders.length === 0) return { score: 0.5, delta: 0 };
  // Pondération : sponsor/décideur comptent 2×, équipe 1×.
  const weights = stakeholders.map((s) =>
    /sponsor|décideur/i.test(s.role) ? 2 : 1,
  );
  const totalW = weights.reduce((a, b) => a + b, 0);
  const score =
    stakeholders.reduce((acc, s, i) => acc + s.sat * weights[i], 0) / totalW;
  // Delta approximatif : moyenne des trends (up +0.05, down -0.05, flat 0).
  const delta =
    stakeholders.reduce(
      (acc, s) => acc + (s.trend === "up" ? 0.05 : s.trend === "down" ? -0.05 : 0),
      0,
    ) / stakeholders.length;
  return { score, delta };
}

/**
 * Insights auto-détectés : règles simples sur les signaux collectés.
 * Version MVP. Les règles plus fines (silence sponsor, friction métier...)
 * viendront via le moteur corrections.ts + rules.ts dans une V2.
 */
function computeInsights(
  stakeholders: Stakeholder[],
  pivots: PulseEvent[],
): Insight[] {
  const out: Insight[] = [];

  // Sponsor silence — pas d'interactions récentes sur un rôle sponsor
  const sponsorSilent = stakeholders.find(
    (s) => /sponsor/i.test(s.role) && s.interactions === 0,
  );
  if (sponsorSilent) {
    out.push({
      id: "sponsor_silence",
      tone: "neg",
      icon: "flag",
      label: "Risque sponsor",
      title: `Silence côté ${sponsorSilent.name}`,
      body: `Aucun signal Plaud capté avec ${sponsorSilent.name}. Le plan a bougé pendant cette absence.`,
      rule: "sponsor_silence = remonter au COPIL",
      action: "Caler un point",
    });
  }

  // Friction métier — stakeholder en trend down avec sat faible
  const frictionSh = stakeholders.find(
    (s) => s.trend === "down" && s.sat < 0.5 && s.interactions >= 2,
  );
  if (frictionSh) {
    out.push({
      id: "friction",
      tone: "neg",
      icon: "warn",
      label: "Friction",
      title: `${frictionSh.name} — tendance baissière`,
      body: `Sat. ${Math.round(frictionSh.sat * 100)} ↓, ${frictionSh.interactions} interactions récentes. Friction détectée.`,
      rule: "metier_friction_sat<0.5_trend_down = 1-1 court",
      action: "Proposer un point",
    });
  }

  // Ambassadeur — stakeholder en trend up avec sat élevée
  const ambassador = stakeholders.find(
    (s) => s.trend === "up" && s.sat >= 0.8 && s.interactions >= 2,
  );
  if (ambassador) {
    out.push({
      id: "ambassador",
      tone: "pos",
      icon: "heart",
      label: "Opportunité",
      title: `${ambassador.name} — ambassadeur·ice`,
      body: `Sat. ${Math.round(ambassador.sat * 100)} ↑, historique positif. Candidat·e naturel·le pour parler de la mission en interne.`,
      rule: "nps_implicite_élevé = référent",
      action: "Lui demander un quote",
    });
  }

  // Beaucoup de bascules récentes — instabilité
  if (pivots.length >= 3) {
    out.push({
      id: "instability",
      tone: "neu",
      icon: "flag",
      label: "Instabilité",
      title: `${pivots.length} bascules détectées sur la période`,
      body: "Fréquence de réorientation élevée. Vérifier si le périmètre initial est réaliste ou si un cadrage plus fort est nécessaire.",
      rule: "pivots >= 3 = revoir cadrage",
      action: "Briefer le sponsor",
    });
  }

  return out;
}

export async function getPulseData(missionId: string): Promise<PulseData> {
  const [stakeholders, { events, pivots }] = await Promise.all([
    computeStakeholders(missionId),
    computeEvents(missionId),
  ]);
  const windowStart = events[0]?.t ?? new Date().toISOString();
  const windowEnd = events[events.length - 1]?.t ?? new Date().toISOString();
  const signalMix = computeSignalMix(events);
  const moodSeries = computeMoodSeries(events);
  const { score: moodScore, delta: moodDelta } = computeMoodScore(stakeholders);
  const insights = computeInsights(stakeholders, pivots);
  return {
    stakeholders,
    events,
    pivots,
    signalMix,
    moodScore,
    moodDelta,
    moodSeries,
    insights,
    windowStart,
    windowEnd,
  };
}
