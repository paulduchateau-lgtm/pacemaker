"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import SidePanel from "@/components/ui/SidePanel";
import { useSidePanel } from "@/hooks/useSidePanel";
import IncoherencesClientTab from "./IncoherencesClientTab";
import RisksClientTab from "./RisksClientTab";
import IncoherencePanel from "@/components/prototype/panels/IncoherencePanel";

type Tab = "incoherences" | "risques" | "pulse";

export default function SignauxPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("incoherences");
  const panel = useSidePanel();

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "risques" || t === "pulse") setTab(t);
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
            QUALITE · SIGNAUX FAIBLES
          </div>
          <h1 className="page-title">Signaux</h1>
          <div className="page-sub">
            Incoherences, risques et signaux humains de la mission.
          </div>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 20 }}>
        <div className={"tab" + (tab === "incoherences" ? " active" : "")} onClick={() => switchTab("incoherences")}>
          Incoherences
        </div>
        <div className={"tab" + (tab === "risques" ? " active" : "")} onClick={() => switchTab("risques")}>
          Risques
        </div>
        <div className={"tab" + (tab === "pulse" ? " active" : "")} onClick={() => switchTab("pulse")}>
          Pulse humain
        </div>
      </div>

      {tab === "incoherences" && (
        <IncoherencesClientTab slug={slug} onOpenPanel={panel.openPanel} />
      )}
      {tab === "risques" && <RisksClientTab slug={slug} />}
      {tab === "pulse" && (
        <div className="card" style={{ padding: 24, color: "var(--muted)", textAlign: "center" }}>
          <div style={{ marginBottom: 8, fontSize: 13.5 }}>Pulse humain</div>
          <div style={{ fontSize: 12 }}>
            Les signaux Plaud (transcripts audio) apparaitront ici.
            Capture des enregistrements depuis l&apos;Inbox.
          </div>
        </div>
      )}

      <SidePanel
        open={panel.open}
        onClose={panel.closePanel}
        title="Incoherence"
      >
        {panel.content?.type === "incoherence" && (
          <IncoherencePanel id={panel.content.id} slug={slug} />
        )}
      </SidePanel>
    </div>
  );
}
