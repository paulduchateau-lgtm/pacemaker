"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import SidePanel from "@/components/ui/SidePanel";
import { useSidePanel } from "@/hooks/useSidePanel";
import WeekPlanTab from "@/components/prototype/plan/WeekPlanTab";
import PhasesTab from "@/components/prototype/plan/PhasesTab";
import LivrablesTab from "@/components/prototype/plan/LivrablesTab";
import ArbitrageTab from "@/components/prototype/plan/ArbitrageTab";
import LivrablePanel from "@/components/prototype/panels/LivrablePanel";
import PhasePanel from "@/components/prototype/panels/PhasePanel";
import MilestonePanel from "@/components/prototype/panels/MilestonePanel";

type Tab = "phases" | "semaines" | "livrables" | "arbitrages";

export default function PlanPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("phases");
  const [pendingCount, setPendingCount] = useState(0);
  const panel = useSidePanel();

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "semaines" || t === "livrables" || t === "arbitrages") setTab(t);
  }, [searchParams]);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/impacts?count=1&status=proposed&mission=${slug}`, { headers: { "x-mission-slug": slug } })
      .then((r) => r.json())
      .then((d) => setPendingCount(Number(d?.count ?? 0)))
      .catch(() => {});
  }, [slug]);

  const switchTab = (t: Tab) => {
    setTab(t);
    router.push(`?tab=${t}`, { scroll: false });
  };

  const getPanelTitle = () => {
    if (!panel.content) return "";
    if (panel.content.type === "livrable") return "Livrable";
    if (panel.content.type === "phase") return "Phase";
    if (panel.content.type === "milestone") return "Jalon";
    return "";
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="mono" style={{ color: "var(--muted)", marginBottom: 6 }}>
            PLAN · PHASES · LIVRABLES
          </div>
          <h1 className="page-title">Plan de mission</h1>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 20 }}>
        <div className={"tab" + (tab === "phases" ? " active" : "")} onClick={() => switchTab("phases")}>Phases</div>
        <div className={"tab" + (tab === "semaines" ? " active" : "")} onClick={() => switchTab("semaines")}>Semaines</div>
        <div className={"tab" + (tab === "livrables" ? " active" : "")} onClick={() => switchTab("livrables")}>Livrables</div>
        <div className={"tab" + (tab === "arbitrages" ? " active" : "")} onClick={() => switchTab("arbitrages")} style={{ position: "relative" }}>
          Arbitrages
          {pendingCount > 0 && (
            <span style={{ marginLeft: 6, display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 18, height: 18, padding: "0 4px", background: "var(--green)", color: "var(--ink)", borderRadius: 9, fontSize: 10, fontFamily: "var(--font-mono, monospace)", fontWeight: 500 }}>
              {pendingCount}
            </span>
          )}
        </div>
      </div>

      {tab === "phases" && <PhasesTab slug={slug} onOpenPanel={panel.openPanel} />}
      {tab === "semaines" && <WeekPlanTab slug={slug} />}
      {tab === "livrables" && <LivrablesTab slug={slug} onOpenPanel={panel.openPanel} />}
      {tab === "arbitrages" && <ArbitrageTab slug={slug} />}

      <SidePanel open={panel.open} onClose={panel.closePanel} title={getPanelTitle()}>
        {panel.content?.type === "livrable" && <LivrablePanel id={panel.content.id} slug={slug} />}
        {panel.content?.type === "phase" && <PhasePanel id={panel.content.id} slug={slug} />}
        {panel.content?.type === "milestone" && <MilestonePanel id={panel.content.id} slug={slug} />}
      </SidePanel>
    </div>
  );
}
