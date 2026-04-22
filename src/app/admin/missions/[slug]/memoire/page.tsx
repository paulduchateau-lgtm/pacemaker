"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import RecalibrationsList from "@/components/prototype/RecalibrationsList";
import JournalAgentList from "@/components/prototype/JournalAgentList";
import SectionHead from "@/components/prototype/SectionHead";
import DecisionsTab from "./DecisionsTab";

type Tab = "contexte" | "decisions" | "agent" | "regles";

export default function MemoirePage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("contexte");
  const [agentSubTab, setAgentSubTab] = useState<"recalibrations" | "journal">("recalibrations");

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "decisions" || t === "agent" || t === "regles") setTab(t);
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
            CONTEXTE · DECISIONS · AGENT · REGLES
          </div>
          <h1 className="page-title">Memoire</h1>
          <div className="page-sub">
            Tout ce que Pacemaker retient de la mission.
          </div>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 20 }}>
        {(["contexte", "decisions", "agent", "regles"] as Tab[]).map((t) => {
          const labels: Record<Tab, string> = { contexte: "Contexte", decisions: "Decisions", agent: "Agent", regles: "Regles" };
          return (
            <div key={t} className={"tab" + (tab === t ? " active" : "")} onClick={() => switchTab(t)}>
              {labels[t]}
            </div>
          );
        })}
      </div>

      {tab === "contexte" && <ContexteTab slug={slug} />}
      {tab === "decisions" && <DecisionsTab slug={slug} />}
      {tab === "agent" && (
        <div>
          <div className="pill-group" style={{ marginBottom: 16 }}>
            <button className={"pill" + (agentSubTab === "recalibrations" ? " active" : "")} onClick={() => setAgentSubTab("recalibrations")}>
              Recalibrages
            </button>
            <button className={"pill" + (agentSubTab === "journal" ? " active" : "")} onClick={() => setAgentSubTab("journal")}>
              Journal agent
            </button>
          </div>
          {agentSubTab === "recalibrations" ? (
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
      )}
      {tab === "regles" && <ReglesTab slug={slug} />}
    </div>
  );
}

function ContexteTab({ slug }: { slug: string }) {
  const [value, setValue] = useState("");
  const [initial, setInitial] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/data/project/context", { headers: { "x-mission-slug": slug } })
      .then((r) => r.json())
      .then((j) => { setValue(j.value ?? ""); setInitial(j.value ?? ""); setLoading(false); })
      .catch(() => setLoading(false));
  }, [slug]);

  const save = async () => {
    setSaving(true);
    await fetch("/api/data/project/context", { method: "PATCH", headers: { "Content-Type": "application/json", "x-mission-slug": slug }, body: JSON.stringify({ value }) });
    setInitial(value);
    setSaving(false);
  };

  if (loading) return <p style={{ color: "var(--muted)" }}>Chargement...</p>;

  return (
    <div className="card" style={{ padding: 20 }}>
      <div className="mono" style={{ color: "var(--muted)", fontSize: 10.5, marginBottom: 10, letterSpacing: "0.1em" }}>
        TEXTE INJECTE DANS LES PROMPTS LLM
      </div>
      <textarea value={value} onChange={(e) => setValue(e.target.value)} rows={14}
        style={{ width: "100%", fontSize: 13, border: "1px solid var(--border)", borderRadius: 4, padding: "8px 12px", background: "var(--paper)", color: "var(--ink)", resize: "vertical", lineHeight: 1.5, fontFamily: "var(--sans)" }} />
      <div style={{ marginTop: 10 }}>
        <button className="btn btn-primary" onClick={save} disabled={value === initial || saving}>
          {saving ? "Sauvegarde..." : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}

function ReglesTab({ slug }: { slug: string }) {
  void slug;
  return (
    <div className="card" style={{ padding: 24, color: "var(--muted)", textAlign: "center" }}>
      Regles apprises — acceder via l&apos;onglet Regles du menu classique ou via les corrections LLM.
    </div>
  );
}
