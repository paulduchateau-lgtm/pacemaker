"use client";

import Icon from "@/components/prototype/Icon";
import Badge from "@/components/prototype/Badge";
import SourceIcon from "@/components/prototype/SourceIcon";
import { isImage, type Source } from "./source-types";

interface Props {
  s: Source;
  onToggleObsolete?: (id: string, current: "active" | "obsolete") => void;
  onDelete?: (id: string) => void;
}

export default function SourceDetail({ s, onToggleObsolete, onDelete }: Props) {
  const obsolete = s.status === "obsolete";

  return (
    <div className="src-doc">
      <div className="src-doc-head">
        <div className="row" style={{ alignItems: "flex-start", gap: 14 }}>
          <div className="src-doc-icon">
            <SourceIcon kind={s.kind} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="row gap-2" style={{ marginBottom: 4 }}>
              <span className="mono muted">{s.id.toUpperCase().slice(0, 14)}</span>
              <Badge tone="soft">{s.fmt}</Badge>
              {obsolete && (
                <Badge tone="amber">OBSOLETE</Badge>
              )}
            </div>
            <h2 className="src-doc-title" style={obsolete ? { textDecoration: "line-through", opacity: 0.6 } : undefined}>
              {s.title}
            </h2>
            <div className="mono muted" style={{ marginTop: 4 }}>
              indexée {s.uploaded.slice(0, 10)} · utilisée {s.used} fois
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="row" style={{ gap: 8, marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border-soft)" }}>
          {onToggleObsolete && (
            <button
              className="btn btn-ghost"
              style={{ fontSize: 12, gap: 6 }}
              onClick={() => onToggleObsolete(s.id, s.status)}
            >
              <Icon name="incoh" />
              {obsolete ? "Réactiver" : "Marquer obsolète"}
            </button>
          )}
          {onDelete && (
            <button
              className="btn btn-ghost"
              style={{ fontSize: 12, gap: 6, color: "var(--alert, #D95B2F)", marginLeft: "auto" }}
              onClick={() => {
                if (confirm(`Supprimer « ${s.title} » et ses chunks RAG ?`)) onDelete(s.id);
              }}
            >
              <Icon name="trash" />
              Supprimer
            </button>
          )}
        </div>
      </div>

      {isImage(s) && s.blobUrl && (
        <div className="src-section">
          <div className="src-section-head">
            <Icon name="eye" />
            <span className="src-section-label">Aperçu image</span>
          </div>
          <a href={s.blobUrl} target="_blank" rel="noopener noreferrer" style={{ display: "block", marginTop: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.blobUrl} alt={s.title} loading="lazy"
              style={{ width: "100%", maxHeight: 520, objectFit: "contain", borderRadius: 6,
                background: "var(--paper-sunk)", border: "1px solid var(--border-soft)" }}
            />
          </a>
        </div>
      )}

      {s.contentPreview && (
        <div className="src-section">
          <div className="src-section-head">
            <Icon name="file" />
            <span className="src-section-label">{s.kind === "vision" ? "Texte extrait (OCR)" : "Extrait texte"}</span>
          </div>
          <div style={{ padding: 12, marginTop: 8, background: "var(--paper-sunk)",
            border: "1px solid var(--border-soft)", borderRadius: 6, fontSize: 12.5,
            lineHeight: 1.5, whiteSpace: "pre-wrap", maxHeight: 300, overflowY: "auto",
            color: "var(--ink-dim)" }}>
            {s.contentPreview}
          </div>
        </div>
      )}

      <div className="src-section">
        <div className="src-section-head">
          <Icon name="sparkle" />
          <span className="src-section-label">Extraits RAG</span>
        </div>
        <div className="src-extracts">
          <div className="src-extract">
            <span className="src-extract-bullet" />
            <span>
              {obsolete
                ? "Source exclue des recherches sémantiques (obsolète)."
                : "Chunks RAG accessibles via searchDocs(). Utilise la recherche sémantique en haut de page."}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
