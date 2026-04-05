"use client";

import type { VisionExtraction } from "@/types";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

interface ExtractionResultProps {
  extraction: VisionExtraction;
  onIntegrate: () => void;
  onKeepAsDoc: () => void;
  onReject: () => void;
  loading?: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  decision: "var(--color-green)",
  action: "var(--color-ink)",
  risk: "var(--color-alert)",
  kpi: "var(--color-amber)",
  schema: "var(--color-copper)",
  note: "var(--color-muted)",
};

export default function ExtractionResult({
  extraction,
  onIntegrate,
  onKeepAsDoc,
  onReject,
  loading,
}: ExtractionResultProps) {
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between mb-2">
          <p className="mono-label" style={{ color: "var(--color-muted)" }}>
            EXTRACTION
          </p>
          <Badge
            label={`${Math.round(extraction.confidence * 100)}%`}
            color="var(--color-green)"
          />
        </div>
        <p className="text-sm mb-3" style={{ color: "var(--color-ink)" }}>
          {extraction.summary}
        </p>

        {extraction.detected_elements.length > 0 && (
          <div className="space-y-2">
            <p className="mono-label" style={{ color: "var(--color-muted)" }}>
              ELEMENTS DETECTES ({extraction.detected_elements.length})
            </p>
            {extraction.detected_elements.map((el, i) => (
              <div
                key={i}
                className="flex items-start gap-2 py-1.5 border-b last:border-b-0"
                style={{ borderColor: "var(--color-border)" }}
              >
                <Badge label={el.type} color={TYPE_COLORS[el.type]} />
                <span className="text-sm flex-1" style={{ color: "var(--color-ink)" }}>
                  {el.content}
                </span>
              </div>
            ))}
          </div>
        )}

        {extraction.ocr_text && (
          <details className="mt-3">
            <summary
              className="mono-label cursor-pointer"
              style={{ color: "var(--color-muted)" }}
            >
              TEXTE OCR COMPLET
            </summary>
            <pre
              className="text-xs mt-2 p-2 overflow-auto whitespace-pre-wrap"
              style={{
                backgroundColor: "var(--color-paper)",
                borderRadius: "4px",
                color: "var(--color-ink)",
              }}
            >
              {extraction.ocr_text}
            </pre>
          </details>
        )}
      </Card>

      <div className="flex flex-col md:flex-row gap-2">
        <Button onClick={onIntegrate} disabled={loading} className="flex-1">
          &#x25B6; INTEGRER
        </Button>
        <Button onClick={onKeepAsDoc} disabled={loading} variant="secondary" className="flex-1">
          &#x2605; GARDER EN DOC
        </Button>
        <Button onClick={onReject} disabled={loading} variant="danger" className="flex-1">
          &#x2715; REJETER
        </Button>
      </div>
    </div>
  );
}
