"use client";

import { useEffect, useRef, useState } from "react";
import Badge from "@/components/ui/Badge";
import CorrectionButton from "@/components/corrections/CorrectionButton";
import { useStore } from "@/store";

interface Props {
  titre: string;
  format: string;
  aiContent: string;
  blobUrl?: string;
  generationId?: string;
  /** Id de la tâche propriétaire du livrable (pour appliquer la correction) */
  taskId?: string;
  /** Index du livrable dans task.livrables_generes.livrables (pour appliquer la correction) */
  livrableIndex?: number;
  onClose: () => void;
}

const PLACEHOLDER_RE = /(\[[\w\s\u00c0-\u017f,.'/-]+\]|<[\w\s\u00c0-\u017f,.'/-]+>|\{\{[\w\s\u00c0-\u017f,.'/-]+\}\}|XXX+|TODO|TBD|À\s*(?:COMPLÉTER|DÉFINIR|REMPLIR)|à\s*(?:compléter|définir|remplir)|N\/A)/gi;

function renderLine(line: string, idx: number) {
  // Heading
  if (line.startsWith("## ")) {
    return (
      <h3
        key={idx}
        className="text-sm font-medium mt-4 mb-2"
        style={{ color: "var(--color-ink)" }}
      >
        {line.replace(/^##\s*/, "")}
      </h3>
    );
  }
  if (line.startsWith("### ")) {
    return (
      <h4
        key={idx}
        className="text-xs font-medium mt-3 mb-1"
        style={{ color: "var(--color-ink)" }}
      >
        {line.replace(/^###\s*/, "")}
      </h4>
    );
  }
  if (line.startsWith("# ")) {
    return (
      <h2
        key={idx}
        className="text-base font-medium mt-4 mb-2"
        style={{ color: "var(--color-ink)" }}
      >
        {line.replace(/^#\s*/, "")}
      </h2>
    );
  }

  // Empty line
  if (!line.trim()) return <div key={idx} className="h-2" />;

  // Bullet
  const isBullet = /^[-*]\s/.test(line);
  const text = isBullet ? line.replace(/^[-*]\s*/, "") : line;

  // Highlight placeholders in red italic
  const parts = text.split(PLACEHOLDER_RE);
  const rendered = parts.map((part, i) => {
    if (PLACEHOLDER_RE.test(part)) {
      return (
        <span key={i} className="italic" style={{ color: "var(--color-alert)" }}>
          {part}
        </span>
      );
    }
    return part;
  });

  if (isBullet) {
    return (
      <li key={idx} className="text-xs ml-4 mb-0.5 list-disc" style={{ color: "var(--color-ink)" }}>
        {rendered}
      </li>
    );
  }

  return (
    <p key={idx} className="text-xs mb-1" style={{ color: "var(--color-ink)" }}>
      {rendered}
    </p>
  );
}

export default function LivrableViewer({ titre, format, aiContent, blobUrl, generationId, taskId, livrableIndex, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [currentContent, setCurrentContent] = useState(aiContent);
  const [currentBlobUrl, setCurrentBlobUrl] = useState(blobUrl);
  const updateTaskLivrables = useStore((s) => s.updateTaskLivrables);
  const fetchDocs = useStore((s) => s.fetchDocs);

  useEffect(() => {
    setCurrentContent(aiContent);
    setCurrentBlobUrl(blobUrl);
  }, [aiContent, blobUrl]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  async function applyCorrection(correctedOutput: string) {
    if (!taskId || livrableIndex === undefined) {
      // Pas de contexte suffisant — la correction ne sera que stockée comme règle
      return;
    }
    const res = await fetch("/api/llm/update-livrable-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId,
        livrableIndex,
        correctedContent: correctedOutput,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Erreur inconnue" }));
      throw new Error(err.error || "Impossible d'appliquer la correction");
    }
    const data = await res.json();
    setCurrentContent(correctedOutput);
    setCurrentBlobUrl(data.url);
    updateTaskLivrables(taskId, data.livrables_generes);
    // Refresh doc library so the new blob URL is reflected
    fetchDocs();
  }

  const lines = currentContent.split("\n");

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 lg:bg-transparent"
        style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
        onClick={onClose}
      />

      {/* Side panel */}
      <div
        ref={panelRef}
        className="fixed inset-0 lg:inset-auto lg:top-0 lg:right-0 lg:bottom-0 lg:w-[520px] z-50 flex flex-col"
        style={{
          backgroundColor: "var(--color-paper)",
          borderLeft: "1px solid var(--color-border)",
        }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 flex items-center justify-between flex-shrink-0"
          style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-mono text-xs uppercase tracking-wider truncate">
              {titre}
            </span>
            <Badge label={format.toUpperCase()} color="var(--color-copper)" />
          </div>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-lg flex-shrink-0"
            style={{ color: "var(--color-paper)" }}
          >
            ×
          </button>
        </div>

        {/* Actions bar */}
        <div
          className="px-4 py-2 flex items-center gap-3 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          {currentBlobUrl && (
            <a
              href={currentBlobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs uppercase tracking-wider px-3 py-1.5 border min-h-[36px] flex items-center"
              style={{ borderColor: "var(--color-border)", borderRadius: "6px", color: "var(--color-ink)" }}
            >
              ↓ Télécharger .{format}
            </a>
          )}
          {generationId && (
            <CorrectionButton
              generationId={generationId}
              rawOutput={currentContent}
              onApply={taskId && livrableIndex !== undefined ? applyCorrection : undefined}
            />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-4 py-4">
          <ul className="list-none p-0 m-0">
            {lines.map((line, i) => renderLine(line, i))}
          </ul>
        </div>

        {/* Footer */}
        <div
          className="px-4 py-2 flex-shrink-0 flex items-center justify-between"
          style={{ borderTop: "1px solid var(--color-border)" }}
        >
          <span className="font-mono text-xs" style={{ color: "var(--color-muted)" }}>
            LITE●OPS — Pacemaker
          </span>
          <span className="font-mono text-xs" style={{ color: "var(--color-muted)" }}>
            {lines.length} lignes
          </span>
        </div>
      </div>
    </>
  );
}
