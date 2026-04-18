"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store";
import type { GenerationType } from "@/types";
import RuleCard from "@/components/corrections/RuleCard";

const TYPES: { value: GenerationType | "all"; label: string }[] = [
  { value: "all", label: "Toutes" },
  { value: "tasks", label: "Tâches" },
  { value: "parse_cr", label: "CR" },
  { value: "recalib", label: "Recalib" },
  { value: "vision", label: "Vision" },
  { value: "livrables", label: "Livrables" },
];

export default function ReglesPage() {
  const { corrections, fetchCorrections, archiveRule } = useStore();
  const [filter, setFilter] = useState<GenerationType | "all">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchCorrections(filter === "all" ? undefined : filter);
  }, [fetchCorrections, filter]);

  const filtered = corrections.filter((c) =>
    search
      ? c.ruleLearned.toLowerCase().includes(search.toLowerCase()) ||
        c.diffSummary.toLowerCase().includes(search.toLowerCase())
      : true
  );

  const grouped = TYPES.filter((t) => t.value !== "all").reduce(
    (acc, t) => {
      const items = filtered.filter((c) => c.generationType === t.value);
      if (items.length > 0) acc.push({ type: t, items });
      return acc;
    },
    [] as { type: (typeof TYPES)[number]; items: typeof corrections }[]
  );

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1
          className="font-mono uppercase tracking-wider"
          style={{ fontSize: "12px", letterSpacing: "0.12em", color: "var(--color-ink)" }}
        >
          Règles apprises
        </h1>
        <span
          className="font-mono"
          style={{ fontSize: "11px", color: "var(--color-muted)" }}
        >
          {corrections.length} règle{corrections.length > 1 ? "s" : ""} active{corrections.length > 1 ? "s" : ""}
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex gap-2 flex-wrap">
          {TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setFilter(t.value)}
              className="font-mono uppercase tracking-wider px-3 py-1.5 border min-h-[44px] sm:min-h-0"
              style={{
                fontSize: "10px",
                letterSpacing: "0.12em",
                borderColor: filter === t.value ? "var(--color-ink)" : "var(--color-border)",
                backgroundColor: filter === t.value ? "var(--color-ink)" : "transparent",
                color: filter === t.value ? "var(--color-paper)" : "var(--color-muted)",
                borderRadius: "6px",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher..."
          className="border px-3 py-1.5 font-sans text-sm flex-1"
          style={{
            borderColor: "var(--color-border)",
            borderRadius: "6px",
            minHeight: "44px",
          }}
        />
      </div>

      {/* Rules grouped by type */}
      {filter === "all" ? (
        grouped.map(({ type, items }) => (
          <div key={type.value} className="mb-8">
            <h2
              className="font-mono uppercase tracking-wider mb-3"
              style={{ fontSize: "10px", letterSpacing: "0.12em", color: "var(--color-muted)" }}
            >
              {type.label} ({items.length})
            </h2>
            <div className="flex flex-col gap-3">
              {items.map((c) => (
                <RuleCard key={c.id} correction={c} onArchive={archiveRule} />
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((c) => (
            <RuleCard key={c.id} correction={c} onArchive={archiveRule} />
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <p className="text-center py-12" style={{ color: "var(--color-muted)", fontSize: "14px" }}>
          Aucune règle apprise pour le moment.
          <br />
          Les règles apparaissent quand tu corriges une génération LLM.
        </p>
      )}
    </div>
  );
}
