"use client";

import { useState } from "react";
import CorrectionModal from "./CorrectionModal";

interface Props {
  generationId: string;
  rawOutput: string;
  onCorrected?: () => void;
}

export default function CorrectionButton({ generationId, rawOutput, onCorrected }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="font-mono uppercase tracking-wider px-2 py-1 border transition-colors"
        style={{
          fontSize: "10px",
          color: "var(--color-muted)",
          borderColor: "var(--color-border)",
          borderRadius: "6px",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-ink)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-muted)")}
      >
        ✎ J&apos;ai corrigé
      </button>
      {open && (
        <CorrectionModal
          generationId={generationId}
          rawOutput={rawOutput}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            onCorrected?.();
          }}
        />
      )}
    </>
  );
}
