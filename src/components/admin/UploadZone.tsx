"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";

export default function UploadZone({ weekId }: { weekId: number }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/llm/parse-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, weekId }),
      });
      const data = await res.json();
      if (data.error) {
        setError(`Erreur : ${data.error}`);
        setLoading(false);
        return;
      }
      // parse-upload déclenche une recalibration synchrone en fin de route.
      // On recharge la page pour voir les nouvelles tâches / livrables /
      // rapports (le store Zustand ne re-fetch pas tout seul).
      window.location.reload();
    } catch {
      setError("Erreur réseau");
      setLoading(false);
    }
  };

  return (
    <div
      className="px-3 py-2 border-t"
      style={{ borderColor: "var(--color-border)" }}
    >
      <details>
        <summary
          className="mono-label cursor-pointer"
          style={{ color: "var(--color-muted)" }}
        >
          IMPORTER UN CR
        </summary>
        <div className="mt-2 space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Collez le compte-rendu ici..."
            className="w-full text-sm bg-transparent border p-2 outline-none resize-y min-h-[80px]"
            style={{
              borderColor: "var(--color-border)",
              borderRadius: "6px",
              color: "var(--color-ink)",
            }}
          />
          <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={handleUpload} disabled={!text.trim() || loading}>
              {loading
                ? "⧳ ANALYSE + RECALIBRATION (20-30s)..."
                : "▶ ANALYSER"}
            </Button>
            {loading && (
              <span
                className="mono-label"
                style={{ color: "var(--color-muted)" }}
              >
                Extraction puis recalibration du plan — la page se rafraîchit
                à la fin.
              </span>
            )}
            {error && (
              <span
                className="text-xs"
                style={{ color: "var(--color-alert)" }}
              >
                {error}
              </span>
            )}
          </div>
        </div>
      </details>
    </div>
  );
}
