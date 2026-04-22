"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Icon from "@/components/prototype/Icon";
import CapturePanel from "@/components/prototype/inbox/CapturePanel";
import UploadPanel from "@/components/prototype/inbox/UploadPanel";
import PlaudPanel from "@/components/prototype/inbox/PlaudPanel";

type Tab = "capture" | "upload" | "plaud";

const TABS: Array<{ id: Tab; label: string; icon: string; sub: string }> = [
  { id: "capture", label: "Capture photo", icon: "camera", sub: "Tableau, Post-it, slide → Vision" },
  { id: "upload", label: "Documents", icon: "upload", sub: "PDF, DOCX, image, texte libre" },
  { id: "plaud", label: "Plaud", icon: "mic", sub: "Transcript audio → extraction" },
];

export default function InboxV2Page() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const [tab, setTab] = useState<Tab>("capture");

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="mono" style={{ color: "var(--muted)", marginBottom: 6 }}>
            CAPTURE RAPIDE · AVANT TRI
          </div>
          <h1 className="page-title">Inbox capture</h1>
          <div className="page-sub">
            Tout ce qui entre avant qu&apos;il ne devienne tâche, décision ou incohérence.
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="card"
              style={{
                padding: 14,
                textAlign: "left",
                cursor: "pointer",
                borderColor: active ? "var(--ink)" : "var(--border-soft)",
                background: active ? "var(--paper-elevated)" : "var(--paper-elevated)",
                boxShadow: active ? "0 0 0 1px var(--ink) inset" : "none",
              }}
            >
              <div className="row" style={{ gap: 10, marginBottom: 4 }}>
                <span
                  style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: active ? "var(--ink)" : "var(--paper-sunk)",
                    color: active ? "var(--paper)" : "var(--muted)",
                    display: "grid", placeItems: "center", flexShrink: 0,
                  }}
                >
                  <Icon name={t.icon} />
                </span>
                <span style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>{t.label}</span>
              </div>
              <div className="mono" style={{ color: "var(--muted)" }}>{t.sub}</div>
            </button>
          );
        })}
      </div>

      <div className="card" style={{ padding: 20 }}>
        {tab === "capture" && <CapturePanel />}
        {tab === "upload" && <UploadPanel slug={slug} />}
        {tab === "plaud" && <PlaudPanel slug={slug} />}
      </div>
    </div>
  );
}
