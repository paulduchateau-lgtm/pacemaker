"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Icon from "@/components/prototype/Icon";
import CapturePanel from "@/components/prototype/inbox/CapturePanel";
import UploadPanel from "@/components/prototype/inbox/UploadPanel";
import PlaudPanel from "@/components/prototype/inbox/PlaudPanel";
import SourcesTab from "./SourcesTab";

type Tab = "capture" | "sources";

export default function InboxPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("capture");
  const [captureTab, setCaptureTab] = useState<"capture" | "upload" | "plaud">("capture");

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "sources") setTab("sources");
  }, [searchParams]);

  const switchTab = (t: Tab) => {
    setTab(t);
    router.push(`?tab=${t}`, { scroll: false });
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="mono" style={{ color: "var(--muted)", marginBottom: 6 }}>
            CAPTURE &amp; SOURCES
          </div>
          <h1 className="page-title">Inbox</h1>
          <div className="page-sub">
            Capture rapide et index de toutes les sources de la mission.
          </div>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 20 }}>
        <div
          className={"tab" + (tab === "capture" ? " active" : "")}
          onClick={() => switchTab("capture")}
        >
          <Icon name="inbox" /> Capture
        </div>
        <div
          className={"tab" + (tab === "sources" ? " active" : "")}
          onClick={() => switchTab("sources")}
        >
          <Icon name="sources" /> Sources
        </div>
      </div>

      {tab === "capture" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
            {(["capture", "upload", "plaud"] as const).map((id) => {
              const meta = {
                capture: { label: "Photo", icon: "camera", sub: "Tableau, Post-it, slide" },
                upload: { label: "Documents", icon: "upload", sub: "PDF, DOCX, texte libre" },
                plaud: { label: "Plaud", icon: "mic", sub: "Transcript audio" },
              }[id];
              const active = captureTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setCaptureTab(id)}
                  className="card"
                  style={{
                    padding: 14,
                    textAlign: "left",
                    cursor: "pointer",
                    borderColor: active ? "var(--ink)" : "var(--border-soft)",
                    boxShadow: active ? "0 0 0 1px var(--ink) inset" : "none",
                  }}
                >
                  <div className="row" style={{ gap: 10, marginBottom: 4 }}>
                    <span style={{ width: 28, height: 28, borderRadius: 7, background: active ? "var(--ink)" : "var(--paper-sunk)", color: active ? "var(--paper)" : "var(--muted)", display: "grid", placeItems: "center" }}>
                      <Icon name={meta.icon} />
                    </span>
                    <span style={{ fontSize: 13.5, fontWeight: 500 }}>{meta.label}</span>
                  </div>
                  <div className="mono" style={{ color: "var(--muted)" }}>{meta.sub}</div>
                </button>
              );
            })}
          </div>
          <div className="card" style={{ padding: 20 }}>
            {captureTab === "capture" && <CapturePanel />}
            {captureTab === "upload" && <UploadPanel slug={slug} />}
            {captureTab === "plaud" && <PlaudPanel slug={slug} />}
          </div>
        </>
      )}

      {tab === "sources" && <SourcesTab slug={slug} />}
    </div>
  );
}
