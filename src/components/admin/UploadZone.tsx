"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { useStore } from "@/store";

export default function UploadZone({ weekId }: { weekId: number }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const fetchTasks = useStore((s) => s.fetchTasks);
  const fetchRisks = useStore((s) => s.fetchRisks);
  const fetchEvents = useStore((s) => s.fetchEvents);

  const handleUpload = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/llm/parse-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, weekId }),
      });
      const data = await res.json();
      if (data.error) {
        setResult(`Erreur : ${data.error}`);
      } else {
        setResult(
          `${data.actions} actions, ${data.decisions} décisions, ${data.risks} risques, ${data.opportunities} opportunités`
        );
        setText("");
        await Promise.all([fetchTasks(), fetchRisks(), fetchEvents()]);
      }
    } catch {
      setResult("Erreur réseau");
    }
    setLoading(false);
  };

  return (
    <div className="px-3 py-2 border-t" style={{ borderColor: "var(--color-border)" }}>
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
          <div className="flex items-center gap-2">
            <Button onClick={handleUpload} disabled={!text.trim() || loading}>
              {loading ? "⧳ ANALYSE..." : "▶ ANALYSER"}
            </Button>
            {result && (
              <span className="text-xs" style={{ color: "var(--color-muted)" }}>
                {result}
              </span>
            )}
          </div>
        </div>
      </details>
    </div>
  );
}
