"use client";

import { useState, useEffect, useCallback } from "react";
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
  const [regenLoading, setRegenLoading] = useState(false);
  const [regenResult, setRegenResult] = useState<string | null>(null);
  const [phasesKey, setPhasesKey] = useState(0); // force remount PhasesTab après regen
  const panel = useSidePanel();

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "semaines" || t === "livrables" || t === "arbitrages") setTab(t);
  }, [searchParams]);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/impacts?count=1&status=proposed&mission=${slug}`, { headers: { "x-mission-slug": slug } })
      .then(r => r.json()).then(d => setPendingCount(Number(d?.count ?? 0))).catch(() => {});
  }, [slug]);

  const switchTab = (t: Tab) => { setTab(t); router.push(`?tab=${t}`, { scroll: false }); };

  const handleRegenerate = useCallback(async () => {
    if (!confirm("Régénérer le plan par phases ?\n\nCette action efface toutes les tâches et livrables existants et les remplace par un nouveau plan généré par Claude.\n\nConfirmer ?")) return;
    setRegenLoading(true);
    setRegenResult(null);
    try {
      const res = await fetch("/api/llm/regenerate-plan", {
        method: "POST",
        headers: { "x-mission-slug": slug },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur serveur");
      setRegenResult(`◆ Plan régénéré — ${data.tasks} tâches · ${data.livrables} livrables`);
      setPhasesKey(k => k + 1); // recharge PhasesTab
      setTab("phases");
    } catch (err) {
      setRegenResult(`⚠ Erreur : ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRegenLoading(false);
    }
  }, [slug]);

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
          <div className="mono" style={{ color: "var(--muted)", marginBottom: 6 }}>PLAN · PHASES · LIVRABLES</div>
          <h1 className="page-title">Plan de mission</h1>
        </div>
        <button
          className="btn btn-ghost"
          style={{ marginLeft: "auto", gap: 6, fontSize: 12, opacity: regenLoading ? 0.6 : 1 }}
          onClick={handleRegenerate}
          disabled={regenLoading}
        >
          <span style={{ fontFamily: "var(--font-mono, monospace)" }}>⟳</span>
          {regenLoading ? "Régénération en cours..." : "Régénérer le plan"}
        </button>
      </div>

      {regenResult && (
        <div className="mono" style={{
          fontSize: 12, padding: "8px 14px", marginBottom: 12,
          background: regenResult.startsWith("◆") ? "rgba(165,217,0,0.1)" : "rgba(217,91,47,0.1)",
          border: "1px solid var(--border-soft)", borderRadius: 6,
          color: regenResult.startsWith("◆") ? "var(--ink)" : "var(--alert, #D95B2F)",
        }}>
          {regenResult}
        </div>
      )}

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

      {tab === "phases" && <PhasesTab key={phasesKey} slug={slug} onOpenPanel={panel.openPanel} />}
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
