"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Icon from "./Icon";
import SourceIcon from "./SourceIcon";

interface AgentAction {
  id: string;
  actionType: string;
  narrative: string;
  reasoning: string | null;
  targetEntityType: string | null;
  targetEntityId: string | null;
  createdAt: string;
}

interface PulseEventMini {
  id: string;
  t: string;
  kind: string;
  label: string;
  tone: "pos" | "neu" | "neg";
  subject: string | null;
  pivot: boolean;
  pivotReason: string | null;
}

interface PulseData {
  events: PulseEventMini[];
  pivots: PulseEventMini[];
  stakeholders: Array<{ id: string; name: string; sat: number; interactions: number }>;
  moodScore: number;
  moodDelta: number;
}

type Tab = "chat" | "ingest" | "reason";

/**
 * Console copilote — rail droit. 3 onglets :
 *   - Conversation : dernières actions agent (agent_actions → narrative)
 *   - Signaux bruts : événements récents (events, plaud, decisions — via /api/pulse)
 *   - Raisonnement : stats du dernier contexte LLM (via /api/pulse pivots + mood)
 */
export default function CopilotConsole({ onClose }: { onClose?: () => void }) {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const [tab, setTab] = useState<Tab>("chat");
  const [compose, setCompose] = useState("");
  const [actions, setActions] = useState<AgentAction[] | null>(null);
  const [pulse, setPulse] = useState<PulseData | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!slug) return;
    try {
      const [a, p] = await Promise.all([
        fetch("/api/agent-actions?limit=20", { headers: { "x-mission-slug": slug } }).then((r) =>
          r.ok ? r.json() : { actions: [] },
        ),
        fetch("/api/pulse", { headers: { "x-mission-slug": slug } }).then((r) =>
          r.ok ? r.json() : null,
        ),
      ]);
      setActions((a.actions ?? []) as AgentAction[]);
      setPulse(p);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur");
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <aside className="copilot">
      <div className="cp-head">
        <span className="dot-live" />
        <div>
          <div className="cp-title">Copilote Pacemaker</div>
        </div>
        <span className="cp-sub">Sonnet 4</span>
        {onClose && (
          <button onClick={onClose} className="icon-btn" style={{ marginLeft: 6 }} data-tip="Fermer">
            <Icon name="x" />
          </button>
        )}
      </div>

      <div className="cp-tabs">
        <div className={"cp-tab" + (tab === "chat" ? " active" : "")} onClick={() => setTab("chat")}>
          Conversation {actions ? <span className="count">{actions.length}</span> : null}
        </div>
        <div className={"cp-tab" + (tab === "ingest" ? " active" : "")} onClick={() => setTab("ingest")}>
          Signaux bruts {pulse ? <span className="count">{pulse.events.length}</span> : null}
        </div>
        <div className={"cp-tab" + (tab === "reason" ? " active" : "")} onClick={() => setTab("reason")}>
          Raisonnement
        </div>
      </div>

      <div className="cp-body" style={{ position: "relative" }}>
        {err && (
          <div className="cp-msg agent" style={{ color: "var(--alert)" }}>
            Erreur : {err}
          </div>
        )}
        {tab === "chat" && <ChatTab actions={actions} />}
        {tab === "ingest" && <IngestTab pulse={pulse} />}
        {tab === "reason" && <ReasonTab pulse={pulse} />}
      </div>

      <div className="cp-compose">
        <div className="compose-box">
          <textarea
            placeholder="Dicte, écris, colle un CR, ou pose une question à Pacemaker…"
            value={compose}
            onChange={(e) => setCompose(e.target.value)}
          />
          <div className="compose-bar">
            <button className="chip" type="button">
              <Icon name="mic" /> Vocal
            </button>
            <button className="chip" type="button">
              <Icon name="camera" /> Photo
            </button>
            <button className="chip" type="button">
              <Icon name="upload" /> Coller CR
            </button>
            <button className="send" type="button" disabled>
              Envoyer ↵
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function ChatTab({ actions }: { actions: AgentAction[] | null }) {
  if (actions === null) {
    return (
      <div className="cp-msg agent">
        <div className="dim">Chargement du journal agent…</div>
      </div>
    );
  }
  if (actions.length === 0) {
    return (
      <div className="cp-msg agent">
        <div className="who">
          <span>Pacemaker</span>
          <span className="ts">prêt</span>
        </div>
        <p>Aucune action agent enregistrée pour cette mission.</p>
        <p className="dim" style={{ fontSize: 12 }}>
          Les actions automatiques (recalibrations, détections d&apos;incohérences, indexations
          RAG) apparaîtront ici en temps réel.
        </p>
      </div>
    );
  }
  return (
    <>
      {actions.map((a) => (
        <div key={a.id} className="cp-msg agent">
          <div className="who">
            <span>{labelForActionType(a.actionType)}</span>
            <span className="ts">{relTime(a.createdAt)}</span>
          </div>
          <p>{a.narrative}</p>
          {a.reasoning && (
            <p className="dim" style={{ fontSize: 12 }}>
              {a.reasoning}
            </p>
          )}
          {a.targetEntityType && (
            <div className="cites">
              <span className="cite">
                {a.targetEntityType} {(a.targetEntityId ?? "").slice(0, 10)}
              </span>
            </div>
          )}
        </div>
      ))}
    </>
  );
}

function IngestTab({ pulse }: { pulse: PulseData | null }) {
  if (!pulse) {
    return (
      <div className="cp-msg agent">
        <div className="dim">Chargement des signaux…</div>
      </div>
    );
  }
  const recent = pulse.events.slice(-15).reverse();
  if (recent.length === 0) {
    return (
      <div className="cp-msg agent">
        <div className="dim">
          Aucun signal capté. Ingère un transcript Plaud ou acte une décision pour amorcer.
        </div>
      </div>
    );
  }
  return (
    <>
      <div className="mono" style={{ color: "var(--muted)", marginBottom: 6 }}>
        FLUX — {recent.length} ÉVÉNEMENTS RÉCENTS
      </div>
      {recent.map((s) => (
        <div key={s.id} className="ingest">
          <span className="src-icon">
            <SourceIcon kind={s.kind === "plaud" ? "plaud" : s.kind === "upload" ? "doc" : s.kind === "vision" ? "photo" : "doc"} />
          </span>
          <div className="ig-body">
            <div className="h">
              <span style={{ fontWeight: 500, color: "var(--ink)" }}>{s.label.slice(0, 80)}</span>
              <span style={{ marginLeft: "auto", fontFamily: "var(--mono)", fontSize: 9.5 }}>
                {relTime(s.t)}
              </span>
            </div>
            <div className="b">
              {s.subject ? `${s.subject} · ` : ""}
              {s.tone === "pos" ? "signal positif" : s.tone === "neg" ? "signal négatif" : "signal neutre"}
              {s.pivot ? " · BASCULE" : ""}
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

function ReasonTab({ pulse }: { pulse: PulseData | null }) {
  if (!pulse) {
    return (
      <div className="cp-msg agent">
        <div className="dim">Chargement…</div>
      </div>
    );
  }
  const moodPct = Math.round(pulse.moodScore * 100);
  const deltaPts = Math.round(Math.abs(pulse.moodDelta) * 100);
  return (
    <div className="cp-msg agent">
      <div className="who">
        <span>Trace raisonnement courant</span>
        <span className="ts">live</span>
      </div>
      <div style={{ fontFamily: "var(--mono)", fontSize: 11, lineHeight: 1.7, color: "var(--ink-dim)" }}>
        <div>
          <strong>Contexte disponible</strong>
        </div>
        <div>· {pulse.events.length} événements dans la fenêtre</div>
        <div>· {pulse.pivots.length} bascules détectées</div>
        <div>· {pulse.stakeholders.length} stakeholders avec signal Plaud</div>
        <div>· Mood projet : {moodPct}/100 ({pulse.moodDelta < 0 ? "↓" : pulse.moodDelta > 0 ? "↑" : "→"} {deltaPts} pts / 7j)</div>
        <div style={{ marginTop: 8 }}>
          <strong>Injection prompt (recalibration)</strong>
        </div>
        <div>· missions.context (tête de prompt, bloc stable caché)</div>
        <div>· Règles apprises · top 5 (similarity &gt; 0.65)</div>
        <div>· RAG chunks · top 12 (seuil 0.65)</div>
        <div>· Décisions récentes · LIMIT 15</div>
        <div>· CHANGEMENTS RÉCENTS · depuis la dernière recalib (decisions + events + schedule + signaux Plaud émotionnels)</div>
        <div style={{ marginTop: 8 }}>
          <strong>Dernières bascules</strong>
        </div>
        {pulse.pivots.slice(-3).reverse().map((p) => (
          <div key={p.id}>· {relTime(p.t)} — {p.label.slice(0, 70)}</div>
        ))}
      </div>
    </div>
  );
}

function labelForActionType(type: string): string {
  const map: Record<string, string> = {
    create_task: "Création tâche",
    update_task: "MAJ tâche",
    create_decision: "Décision actée",
    flag_incoherence: "Incohérence",
    recalibrate_plan: "Recalibration",
    update_deliverable: "MAJ livrable",
    add_context: "Contexte enrichi",
    ask_user: "Demande user",
    extract_correction_rule: "Règle apprise",
  };
  return map[type] ?? type;
}

function relTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (isNaN(t)) return iso.slice(0, 10);
  const diffMs = Date.now() - t;
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin}min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH}h`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 7) return `il y a ${diffD}j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}
