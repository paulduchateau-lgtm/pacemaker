"use client";

import { useState } from "react";
import Icon from "./Icon";
import SourceIcon from "./SourceIcon";

interface Props {
  onClose?: () => void;
}

type Tab = "chat" | "ingest" | "reason";

/**
 * Console copilote — rail droit. 3 onglets : Conversation, Signaux bruts,
 * Raisonnement. MVP stub : le contenu est mock, en attendant le branchement
 * sur /api/agent-actions + /api/pulse + recent-changes pour alimenter
 * réellement la vue.
 */
export default function CopilotConsole({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>("chat");
  const [compose, setCompose] = useState("");

  return (
    <aside className="copilot">
      <div className="cp-head">
        <span className="dot-live" />
        <div>
          <div className="cp-title">Copilote Pacemaker</div>
        </div>
        <span className="cp-sub">Sonnet 4 · Live</span>
        {onClose && (
          <button onClick={onClose} className="icon-btn" style={{ marginLeft: 6 }} data-tip="Fermer">
            <Icon name="x" />
          </button>
        )}
      </div>

      <div className="cp-tabs">
        <div className={"cp-tab" + (tab === "chat" ? " active" : "")} onClick={() => setTab("chat")}>
          Conversation
        </div>
        <div className={"cp-tab" + (tab === "ingest" ? " active" : "")} onClick={() => setTab("ingest")}>
          Signaux bruts
        </div>
        <div className={"cp-tab" + (tab === "reason" ? " active" : "")} onClick={() => setTab("reason")}>
          Raisonnement
        </div>
      </div>

      <div className="cp-body" style={{ position: "relative" }}>
        {tab === "chat" && (
          <div className="cp-msg agent">
            <div className="who">
              <span>Pacemaker</span>
              <span className="ts">à l&apos;instant</span>
            </div>
            <p>
              Bienvenue dans le shell v2. Le copilote branchera sa conversation sur les journaux
              agent / signaux récents dès que le backend livrera /api/copilote.
            </p>
            <p className="dim" style={{ fontSize: 12 }}>
              Pour l&apos;instant : pose une question, elle sera relayée à l&apos;API LLM avec le
              contexte mission complet.
            </p>
          </div>
        )}

        {tab === "ingest" && (
          <div className="cp-msg agent">
            <div className="who">
              <span>Flux temps-réel</span>
              <span className="ts">mock</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <IngestStub kind="plaud" label="Plaud · captation active" body="Cette zone affichera les dernières ingestions." />
              <IngestStub kind="whatsapp" label="WhatsApp · allowlist" body="Branchement prévu : /api/ingest/whatsapp." />
              <IngestStub kind="doc" label="Upload" body="Les derniers docs uploadés remonteront ici." />
            </div>
          </div>
        )}

        {tab === "reason" && (
          <div className="cp-msg agent">
            <div className="who">
              <span>Trace — dernier prompt</span>
              <span className="ts">mock</span>
            </div>
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: 11,
                lineHeight: 1.7,
                color: "var(--ink-dim)",
              }}
            >
              <div>
                <strong>Contexte injecté (source de vérité : recent-changes.ts)</strong>
              </div>
              <div>· Mission context · N tok</div>
              <div>· Règles apprises (top 5) · N tok</div>
              <div>· RAG (top 12 chunks, seuil 0.65) · N tok</div>
              <div>· Décisions actives (LIMIT 15) · N tok</div>
              <div>· Changements récents (decisions + events + schedule) · N tok</div>
              <div>· Signaux Plaud émotionnels · N tok</div>
            </div>
          </div>
        )}
      </div>

      <div className="cp-compose">
        <div className="compose-box">
          <textarea
            placeholder="Dicte, écris, colle un CR, ou pose une question à Pacemaker…"
            value={compose}
            onChange={(e) => setCompose(e.target.value)}
          />
          <div className="compose-bar">
            <button className="chip">
              <Icon name="mic" /> Vocal
            </button>
            <button className="chip">
              <Icon name="camera" /> Photo
            </button>
            <button className="chip">
              <Icon name="upload" /> Coller CR
            </button>
            <button className="send">Envoyer ↵</button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function IngestStub({ kind, label, body }: { kind: string; label: string; body: string }) {
  return (
    <div className="ingest">
      <span className="src-icon">
        <SourceIcon kind={kind} />
      </span>
      <div className="ig-body">
        <div className="h">
          <span style={{ fontWeight: 500, color: "var(--ink)" }}>{label}</span>
        </div>
        <div className="b">{body}</div>
      </div>
    </div>
  );
}
