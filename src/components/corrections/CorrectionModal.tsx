"use client";

import { useState } from "react";
import { useStore } from "@/store";

interface Props {
  generationId: string;
  rawOutput: string;
  onClose: () => void;
  onSaved: () => void;
  /**
   * Callback optionnelle appelée avec le texte corrigé AVANT l'extraction de règle.
   * Permet au parent d'appliquer la correction au livrable source (DB + blob).
   */
  onApply?: (correctedOutput: string) => Promise<void>;
}

export default function CorrectionModal({ generationId, rawOutput, onClose, onSaved, onApply }: Props) {
  const [corrected, setCorrected] = useState(rawOutput);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const submitCorrection = useStore((s) => s.submitCorrection);

  async function save() {
    if (corrected === rawOutput) return;
    setSaving(true);
    try {
      // 1. Applique la correction au contenu source si le parent le supporte
      if (onApply) {
        setToast("Application de la correction...");
        await onApply(corrected);
      }
      // 2. Extrait la règle apprise
      setToast("Extraction de la règle...");
      const result = await submitCorrection(generationId, corrected);
      setToast(
        onApply
          ? `Livrable mis à jour — règle apprise : ${result.ruleLearned}`
          : `Règle apprise : ${result.ruleLearned}`
      );
      setTimeout(onSaved, 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur";
      setToast(`Erreur : ${msg}`);
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
    >
      <div
        className="w-full h-full md:h-auto md:max-h-[90vh] md:max-w-5xl flex flex-col"
        style={{ backgroundColor: "var(--color-paper)", borderRadius: "0" }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}
        >
          <span className="font-mono text-xs uppercase tracking-wider">
            Corriger la génération
          </span>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-lg"
            style={{ color: "var(--color-paper)" }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-4 p-4">
          <div>
            <label
              className="font-mono uppercase mb-2 block"
              style={{ fontSize: "10px", letterSpacing: "0.12em", color: "var(--color-muted)" }}
            >
              Version générée
            </label>
            <pre
              className="border p-3 whitespace-pre-wrap font-sans overflow-auto"
              style={{
                fontSize: "12px",
                borderColor: "var(--color-border)",
                backgroundColor: "white",
                maxHeight: "60vh",
                borderRadius: "6px",
              }}
            >
              {rawOutput}
            </pre>
          </div>
          <div>
            <label
              className="font-mono uppercase mb-2 block"
              style={{ fontSize: "10px", letterSpacing: "0.12em", color: "var(--color-muted)" }}
            >
              Ta correction
            </label>
            <textarea
              value={corrected}
              onChange={(e) => setCorrected(e.target.value)}
              className="w-full border p-3 font-sans"
              style={{
                fontSize: "12px",
                minHeight: "400px",
                borderColor: "var(--color-border)",
                backgroundColor: "white",
                borderRadius: "6px",
                resize: "vertical",
              }}
            />
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div
            className="mx-4 mb-2 px-3 py-2 font-mono text-xs"
            style={{
              backgroundColor: "var(--color-green)",
              color: "var(--color-ink)",
              borderRadius: "6px",
            }}
          >
            {toast}
          </div>
        )}

        {/* Footer */}
        <div
          className="p-4 flex justify-end gap-2"
          style={{ borderTop: "1px solid var(--color-border)" }}
        >
          <button
            onClick={onClose}
            className="font-mono text-xs uppercase px-4 py-2 border min-h-[44px]"
            style={{ borderColor: "var(--color-border)", borderRadius: "6px" }}
          >
            Annuler
          </button>
          <button
            onClick={save}
            disabled={saving || corrected === rawOutput}
            className="font-mono text-xs uppercase px-4 py-2 min-h-[44px]"
            style={{
              backgroundColor: "var(--color-ink)",
              color: "var(--color-green)",
              borderRadius: "6px",
              opacity: saving || corrected === rawOutput ? 0.5 : 1,
            }}
          >
            {saving ? "Analyse..." : "Enregistrer la correction"}
          </button>
        </div>
      </div>
    </div>
  );
}
