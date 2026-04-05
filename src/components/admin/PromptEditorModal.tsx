"use client";

import { useState, useEffect } from "react";

interface Props {
  taskId: string;
  livrable: { titre: string; description: string; format: string };
  onClose: () => void;
  onSubmit: (prompt: string) => void;
}

export default function PromptEditorModal({ taskId, livrable, onClose, onSubmit }: Props) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPrompt() {
      try {
        const res = await fetch("/api/llm/create-livrable/prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId, livrable }),
        });
        const data = await res.json();
        setPrompt(data.prompt || "");
      } catch {
        setPrompt("Erreur lors du chargement du prompt");
      }
      setLoading(false);
    }
    fetchPrompt();
  }, [taskId, livrable]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
    >
      <div
        className="w-full h-full md:h-auto md:max-h-[90vh] md:max-w-4xl flex flex-col"
        style={{ backgroundColor: "var(--color-paper)" }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 flex items-center justify-between flex-shrink-0"
          style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}
        >
          <div>
            <span className="font-mono text-xs uppercase tracking-wider">
              Prompt — {livrable.titre}
            </span>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>
              Modifiez le prompt avant la génération. Votre version sera mémorisée.
            </p>
          </div>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-lg"
            style={{ color: "var(--color-paper)" }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <span className="font-mono text-xs" style={{ color: "var(--color-muted)" }}>
                Chargement du prompt...
              </span>
            </div>
          ) : (
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full h-full min-h-[400px] md:min-h-[500px] font-mono text-xs border p-4 outline-none resize-none"
              style={{
                borderColor: "var(--color-border)",
                backgroundColor: "white",
                color: "var(--color-ink)",
                borderRadius: "6px",
                lineHeight: "1.6",
              }}
            />
          )}
        </div>

        {/* Footer */}
        <div
          className="p-4 flex items-center justify-between flex-shrink-0"
          style={{ borderTop: "1px solid var(--color-border)" }}
        >
          <span className="font-mono text-xs" style={{ color: "var(--color-muted)" }}>
            {prompt.length} car.
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="font-mono text-xs uppercase px-4 py-2 border min-h-[44px]"
              style={{ borderColor: "var(--color-border)", borderRadius: "6px" }}
            >
              Annuler
            </button>
            <button
              onClick={() => onSubmit(prompt)}
              disabled={loading || !prompt.trim()}
              className="font-mono text-xs uppercase px-4 py-2 min-h-[44px]"
              style={{
                backgroundColor: "var(--color-ink)",
                color: "var(--color-green)",
                borderRadius: "6px",
                opacity: loading || !prompt.trim() ? 0.5 : 1,
              }}
            >
              ▶ Générer le livrable
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
