"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import RecalibrationsList from "@/components/prototype/RecalibrationsList";
import JournalAgentList from "@/components/prototype/JournalAgentList";
import SectionHead from "@/components/prototype/SectionHead";

type Tab = "recalibrations" | "agent";

export default function RecalibrationsV2Page() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const [tab, setTab] = useState<Tab>("recalibrations");

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="mono" style={{ color: "var(--muted)", marginBottom: 6 }}>
            TRACE · RECALIBRAGES & AGENT
          </div>
          <h1 className="page-title">Recalibrages & journal agent</h1>
          <div className="page-sub">
            Historique des ré-plans (annulables) et trace des actions prises par l&apos;agent sur cette mission.
          </div>
        </div>
        <div className="pill-group">
          <button className={"pill" + (tab === "recalibrations" ? " active" : "")} onClick={() => setTab("recalibrations")}>
            Recalibrages
          </button>
          <button className={"pill" + (tab === "agent" ? " active" : "")} onClick={() => setTab("agent")}>
            Journal agent
          </button>
        </div>
      </div>

      {tab === "recalibrations" ? (
        <>
          <SectionHead icon="branch" label="Recalibrages" />
          <RecalibrationsList slug={slug} />
        </>
      ) : (
        <>
          <SectionHead icon="sparkle" label="Actions de l'agent" />
          <JournalAgentList slug={slug} />
        </>
      )}
    </div>
  );
}
