// ─── Enums ──────────────────────────────────────────────

export type Phase =
  | "Cadrage"
  | "Construction socle"
  | "Développement"
  | "Stabilisation"
  | "Transfert";

export type TaskStatus = "à faire" | "en cours" | "bloqué" | "fait";
export type TaskPriority = "haute" | "moyenne" | "basse";
export type TaskOwner = "Paul" | "Paul B." | "Client";
export type TaskSource = "manual" | "llm" | "upload" | "recalib" | "vision";
export type LivrableStatus = "planifié" | "en cours" | "livré" | "validé";
export type RiskStatus = "actif" | "mitigé" | "clos";
export type EventType =
  | "decision"
  | "upload"
  | "opportunity"
  | "recalib"
  | "task"
  | "risk"
  | "budget"
  | "vision"
  | "schedule";

export type RapportLot = 1 | 2 | 3;
export type RapportComplexite = "haute" | "moyenne" | "basse";
export type DocType = "cr" | "note" | "spec" | "photo" | "autre";
export type DocSource = "upload" | "vision" | "manual";

// ─── Entités ────────────────────────────────────────────

export interface Week {
  id: number;
  phase: Phase;
  title: string;
  budget_jh: number;
  actions: string[];
  livrables: string[];
  owner: string;
  startDate: string | null;
  endDate: string | null;
  baselineStartDate: string | null;
  baselineEndDate: string | null;
}

export interface TaskAttachment {
  id: string;
  taskId: string;
  filename: string;
  blobUrl: string;
  contentType: string;
  createdAt: string;
}

export interface Task {
  id: string;
  weekId: number;
  label: string;
  description: string;
  owner: TaskOwner;
  priority: TaskPriority;
  status: TaskStatus;
  source: TaskSource;
  createdAt: string;
  completedAt: string | null;
  jh_estime?: number;
  livrables_generes?: string;
  attachments?: TaskAttachment[];
}

export interface Risk {
  id: string;
  label: string;
  impact: number;
  probability: number;
  status: RiskStatus;
  mitigation: string;
}

export interface Livrable {
  id: string;
  weekId: number;
  label: string;
  status: LivrableStatus;
  deliveryDate: string | null;
}

export type ScheduleChangeType = "recalage_planifie" | "deviation";

export interface ScheduleChange {
  id: string;
  weekId: number;
  field: string;
  oldValue: string | null;
  newValue: string;
  changeType: ScheduleChangeType;
  cascaded: boolean;
  reason: string;
  createdAt: string;
}

export interface MissionEvent {
  id: string;
  type: EventType;
  label: string;
  weekId: number;
  date: string;
  content?: string;
}

export interface Rapport {
  id: string;
  label: string;
  etat: string;
  complexite: RapportComplexite;
  lot: RapportLot;
  weekId: number | null;
}

export interface Document {
  id: string;
  title: string;
  type: DocType;
  source: DocSource;
  weekId: number | null;
  blobUrl: string | null;
  content: string;
  createdAt: string;
}

export interface DocChunk {
  id: string;
  docId: string;
  chunkIndex: number;
  content: string;
}

export interface VisionExtraction {
  ocr_text: string;
  summary: string;
  detected_elements: {
    type: "decision" | "action" | "risk" | "kpi" | "schema" | "note";
    content: string;
  }[];
  confidence: number;
}

export interface RagSearchResult {
  chunkId: string;
  docId: string;
  docTitle: string;
  content: string;
  distance: number;
}

export interface Echeance {
  date: string;
  pct: number;
  montant: number;
  label: string;
}

export interface Budget {
  vendu_jh: number;
  reel_cible_jh: number;
  forfait_ht: number;
  tjm_affiche: number;
  tjm_reel_cible: number;
  echeances: Echeance[];
}

// ─── Apprentissage continu ─────────────────────────────

export type GenerationType = "tasks" | "parse_cr" | "recalib" | "vision" | "livrables";
export type CorrectionStatus = "active" | "superseded" | "archived";

export interface Generation {
  id: string;
  generationType: GenerationType;
  context: Record<string, unknown>;
  prompt: string;
  rawOutput: string;
  appliedRules: string[];
  weekId: number | null;
  createdAt: string;
}

export interface Correction {
  id: string;
  generationId: string;
  correctedOutput: string;
  diffSummary: string;
  ruleLearned: string;
  generationType: GenerationType;
  appliedCount: number;
  status: CorrectionStatus;
  createdAt: string;
}

export interface Rule {
  id: string;
  type: GenerationType;
  text: string;
  appliedCount: number;
  createdAt: string;
}

export interface ProjectState {
  currentWeek: number;
  jh_consommes: number;
  missionStartDate: string | null;
}

// ─── Mission multi-tenant (chantier 1) ─────────────────

export type MissionStatus = "active" | "paused" | "archived";

export interface Mission {
  id: string;
  slug: string;
  label: string;
  client: string | null;
  startDate: string;
  endDate: string;
  status: MissionStatus;
  theme: string;
  context: string | null;
  ownerUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMissionInput {
  slug: string;
  label: string;
  client?: string | null;
  startDate: string;
  endDate: string;
  theme?: string;
  context?: string | null;
  ownerUserId?: string;
}

export interface UpdateMissionInput {
  label?: string;
  client?: string | null;
  startDate?: string;
  endDate?: string;
  status?: MissionStatus;
  theme?: string;
  context?: string | null;
}
