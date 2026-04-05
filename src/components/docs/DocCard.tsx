"use client";

import type { Document } from "@/types";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

interface DocCardProps {
  doc: Document;
  onClick: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  cr: "COMPTE-RENDU",
  note: "NOTE",
  spec: "SPEC",
  photo: "PHOTO",
  autre: "AUTRE",
};

export default function DocCard({ doc, onClick }: DocCardProps) {
  return (
    <Card className="cursor-pointer hover:opacity-90 transition-opacity">
      <button onClick={onClick} className="w-full text-left min-h-[44px]">
        <div className="flex items-center gap-2 mb-1">
          <Badge label={TYPE_LABELS[doc.type] || doc.type} />
          {doc.weekId && <Badge label={`S${doc.weekId}`} />}
          <Badge label={doc.source} color="var(--color-muted)" />
        </div>
        <p className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
          {doc.title}
        </p>
        <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--color-muted)" }}>
          {doc.content.slice(0, 150)}
        </p>
      </button>
    </Card>
  );
}
