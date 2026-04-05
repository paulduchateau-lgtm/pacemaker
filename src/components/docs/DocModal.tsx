"use client";

import type { Document } from "@/types";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

interface DocModalProps {
  doc: Document;
  onClose: () => void;
}

export default function DocModal({ doc, onClose }: DocModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="relative w-full h-full lg:w-[640px] lg:h-auto lg:max-h-[80vh] overflow-auto bg-white lg:rounded-md p-4 md:p-6"
        style={{ border: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Badge label={doc.type} />
            {doc.weekId && <Badge label={`S${doc.weekId}`} />}
          </div>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center"
            style={{ color: "var(--color-muted)" }}
          >
            &#x2715;
          </button>
        </div>
        <h2 className="text-lg font-medium mb-2" style={{ color: "var(--color-ink)" }}>
          {doc.title}
        </h2>
        <p className="mono-label mb-4" style={{ color: "var(--color-muted)" }}>
          {doc.createdAt}
        </p>
        {doc.blobUrl && doc.type === "photo" && (
          <img
            src={doc.blobUrl}
            alt={doc.title}
            className="w-full mb-4 object-contain"
            loading="lazy"
            style={{ borderRadius: "6px", maxHeight: "300px" }}
          />
        )}
        <div
          className="text-sm whitespace-pre-wrap"
          style={{ color: "var(--color-ink)" }}
        >
          {doc.content}
        </div>
        <div className="mt-4">
          <Button onClick={onClose} variant="secondary" className="w-full md:w-auto">
            FERMER
          </Button>
        </div>
      </div>
    </div>
  );
}
