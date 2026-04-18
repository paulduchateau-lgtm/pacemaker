"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DecisionAuthor } from "@/types";

const AUTHORS: { value: DecisionAuthor; label: string }[] = [
  { value: "paul", label: "Paul" },
  { value: "paul_b", label: "Paul B." },
  { value: "client", label: "Client" },
];

export default function DecisionForm({ missionSlug }: { missionSlug: string }) {
  const router = useRouter();
  const [statement, setStatement] = useState("");
  const [rationale, setRationale] = useState("");
  const [alternatives, setAlternatives] = useState("");
  const [author, setAuthor] = useState<DecisionAuthor>("paul");
  const [weekId, setWeekId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const body = {
        statement,
        rationale: rationale.trim() || null,
        alternatives: alternatives
          .split("\n")
          .map((a) => a.trim())
          .filter(Boolean),
        author,
        weekId: weekId ? parseInt(weekId, 10) : null,
      };
      const res = await fetch("/api/decisions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-mission-slug": missionSlug,
        },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Création impossible");
      setStatement("");
      setRationale("");
      setAlternatives("");
      setWeekId("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSubmitting(false);
    }
  }

  const labelCls = "block mono-label mb-1";
  const inputCls = "w-full px-3 py-2 text-sm";
  const inputStyle: React.CSSProperties = {
    backgroundColor: "#FFFFFF",
    border: "1px solid var(--color-border)",
    borderRadius: "6px",
    color: "var(--color-ink)",
  };

  return (
    <form
      onSubmit={onSubmit}
      className="p-4 space-y-3"
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid var(--color-border)",
        borderRadius: "6px",
      }}
    >
      <div>
        <label className={labelCls} style={{ color: "var(--color-muted)" }}>
          Énoncé de la décision *
        </label>
        <input
          className={inputCls}
          style={inputStyle}
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          required
          placeholder="Ex: on repousse le COPIL du 25 au 30 mai"
        />
      </div>
      <div>
        <label className={labelCls} style={{ color: "var(--color-muted)" }}>
          Motifs (pourquoi)
        </label>
        <textarea
          className={inputCls}
          style={{ ...inputStyle, minHeight: "80px" }}
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          placeholder="Client indisponible, budget à stabiliser, etc."
        />
      </div>
      <div>
        <label className={labelCls} style={{ color: "var(--color-muted)" }}>
          Alternatives envisagées (une par ligne)
        </label>
        <textarea
          className={inputCls}
          style={{ ...inputStyle, minHeight: "60px" }}
          value={alternatives}
          onChange={(e) => setAlternatives(e.target.value)}
          placeholder={"Garder le 25/05 avec présentation partielle\nAnnuler et replanifier en juin"}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls} style={{ color: "var(--color-muted)" }}>
            Prise par
          </label>
          <select
            className={inputCls}
            style={inputStyle}
            value={author}
            onChange={(e) => setAuthor(e.target.value as DecisionAuthor)}
          >
            {AUTHORS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} style={{ color: "var(--color-muted)" }}>
            Semaine (optionnel)
          </label>
          <input
            className={inputCls}
            style={inputStyle}
            type="number"
            min="1"
            max="52"
            value={weekId}
            onChange={(e) => setWeekId(e.target.value)}
            placeholder="1–7"
          />
        </div>
      </div>

      {error && (
        <div
          className="px-3 py-2 text-xs"
          style={{
            color: "var(--color-alert)",
            backgroundColor: "#FDECEA",
            borderRadius: "6px",
          }}
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || !statement.trim()}
        className="px-4 py-2 mono-label"
        style={{
          backgroundColor: "var(--color-green)",
          color: "var(--color-ink)",
          borderRadius: "6px",
          opacity: submitting || !statement.trim() ? 0.5 : 1,
        }}
      >
        {submitting ? "ENREGISTREMENT..." : "ACTER LA DÉCISION"}
      </button>
    </form>
  );
}
