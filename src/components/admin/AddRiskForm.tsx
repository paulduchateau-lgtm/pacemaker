"use client";

import { useState } from "react";
import { useStore } from "@/store";
import Button from "@/components/ui/Button";

export default function AddRiskForm() {
  const addRisk = useStore((s) => s.addRisk);
  const [label, setLabel] = useState("");
  const [impact, setImpact] = useState(3);
  const [probability, setProbability] = useState(3);
  const [mitigation, setMitigation] = useState("");

  const handleSubmit = async () => {
    if (!label.trim()) return;
    await addRisk({
      label: label.trim(),
      impact,
      probability,
      status: "actif",
      mitigation: mitigation.trim(),
    });
    setLabel("");
    setMitigation("");
    setImpact(3);
    setProbability(3);
  };

  return (
    <div
      className="p-4 border"
      style={{ borderColor: "var(--color-border)", borderRadius: "6px" }}
    >
      <p className="mono-label mb-3" style={{ color: "var(--color-muted)" }}>
        AJOUTER UN RISQUE
      </p>
      <div className="space-y-2">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Description du risque"
          className="w-full text-sm bg-transparent border px-3 py-2 outline-none"
          style={{
            borderColor: "var(--color-border)",
            borderRadius: "6px",
            color: "var(--color-ink)",
          }}
        />
        <div className="flex gap-3">
          <label className="flex items-center gap-2">
            <span className="mono-label" style={{ color: "var(--color-muted)" }}>
              IMPACT
            </span>
            <select
              value={impact}
              onChange={(e) => setImpact(Number(e.target.value))}
              className="bg-transparent border px-2 py-1 text-sm"
              style={{ borderColor: "var(--color-border)", borderRadius: "4px" }}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="mono-label" style={{ color: "var(--color-muted)" }}>
              PROBABILITE
            </span>
            <select
              value={probability}
              onChange={(e) => setProbability(Number(e.target.value))}
              className="bg-transparent border px-2 py-1 text-sm"
              style={{ borderColor: "var(--color-border)", borderRadius: "4px" }}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>
        <input
          type="text"
          value={mitigation}
          onChange={(e) => setMitigation(e.target.value)}
          placeholder="Plan de mitigation"
          className="w-full text-sm bg-transparent border px-3 py-2 outline-none"
          style={{
            borderColor: "var(--color-border)",
            borderRadius: "6px",
            color: "var(--color-ink)",
          }}
        />
        <Button onClick={handleSubmit} disabled={!label.trim()}>
          AJOUTER
        </Button>
      </div>
    </div>
  );
}
