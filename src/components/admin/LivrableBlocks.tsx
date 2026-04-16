"use client";

import type { Block } from "@/lib/livrables/types";

/**
 * Rendu HTML sobre (charte Lite Ops) d'un tableau de Block.
 * Utilisé par LivrableViewer pour afficher le payload structuré à l'écran.
 * Les couleurs thème ne sont pas appliquées ici — c'est l'export DOCX/XLSX/PPTX
 * qui porte le branding. L'aperçu reste neutre.
 */
export default function LivrableBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-3">
      {blocks.map((b, i) => (
        <BlockRow key={i} block={b} />
      ))}
    </div>
  );
}

function BlockRow({ block }: { block: Block }) {
  switch (block.kind) {
    case "cover":
      return (
        <div className="pb-3 mb-2 border-b" style={{ borderColor: "var(--color-border)" }}>
          <h2 className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
            {block.title}
          </h2>
          {block.subtitle && (
            <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>
              {block.subtitle}
            </p>
          )}
          {block.meta && (
            <dl className="mt-2 text-xs space-y-0.5" style={{ color: "var(--color-muted)" }}>
              {block.meta.client && <div>Client : {block.meta.client}</div>}
              {block.meta.emitter && <div>Émetteur : {block.meta.emitter}</div>}
              {block.meta.date && <div>Date : {block.meta.date}</div>}
              {block.meta.version && <div>Version : {block.meta.version}</div>}
              {block.meta.confidential && <div>Confidentialité : {block.meta.confidential}</div>}
            </dl>
          )}
        </div>
      );
    case "toc":
      return (
        <ol className="text-xs list-decimal ml-5 space-y-0.5" style={{ color: "var(--color-ink)" }}>
          {block.items.map((it, i) => <li key={i}>{it}</li>)}
        </ol>
      );
    case "section": {
      const sizes = { 1: "text-sm", 2: "text-xs", 3: "text-xs" } as const;
      return (
        <h3 className={`${sizes[block.level]} font-medium mt-3`} style={{ color: "var(--color-ink)" }}>
          {block.title}
        </h3>
      );
    }
    case "paragraph":
      return (
        <p className="text-xs" style={{ color: "var(--color-ink)", fontWeight: block.emphasis ? 500 : 400 }}>
          {block.text}
        </p>
      );
    case "bullet_list":
      return (
        <ul className="text-xs list-disc ml-5 space-y-0.5" style={{ color: "var(--color-ink)" }}>
          {block.items.map((it, i) => <li key={i}>{it}</li>)}
        </ul>
      );
    case "numbered_list":
      return (
        <ol className="text-xs list-decimal ml-5 space-y-0.5" style={{ color: "var(--color-ink)" }}>
          {block.items.map((it, i) => <li key={i}>{it}</li>)}
        </ol>
      );
    case "kpi_grid": {
      const gridClass =
        block.cols === 2
          ? "grid grid-cols-2 gap-2"
          : block.cols === 4
            ? "grid grid-cols-2 md:grid-cols-4 gap-2"
            : "grid grid-cols-2 md:grid-cols-3 gap-2";
      return (
        <div className={gridClass}>
          {block.cards.map((c, i) => (
            <div key={i} className="border p-2" style={{ borderColor: "var(--color-border)", borderRadius: 6 }}>
              <div className="font-mono uppercase text-[10px]" style={{ color: "var(--color-muted)", letterSpacing: "0.12em" }}>
                {c.label}
              </div>
              <div className="text-sm font-medium mt-1" style={{ color: "var(--color-ink)" }}>
                {c.value}
              </div>
              {c.delta && (
                <div className="text-[11px] mt-0.5" style={{ color: c.tone === "critical" ? "var(--color-alert)" : c.tone === "positive" ? "var(--color-green)" : "var(--color-muted)" }}>
                  {c.delta}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }
    case "table":
      return (
        <div className="overflow-x-auto">
          <table className="text-xs w-full" style={{ color: "var(--color-ink)" }}>
            <thead>
              <tr>
                {block.headers.map((h, i) => (
                  <th key={i} className="text-left px-2 py-1 border-b" style={{ borderColor: "var(--color-border)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => {
                    const v = typeof cell === "string" ? cell : cell.value;
                    const tone = typeof cell === "string" ? "neutral" : cell.tone;
                    return (
                      <td key={ci} className="px-2 py-1 border-b" style={{ borderColor: "var(--color-border)", color: tone === "critical" ? "var(--color-alert)" : tone === "positive" ? "var(--color-green)" : "var(--color-ink)" }}>
                        {v}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {block.totals && (
                <tr>
                  {block.totals.map((t, i) => (
                    <td key={i} className="px-2 py-1 font-medium" style={{ color: "var(--color-ink)" }}>{t}</td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      );
    case "callout":
      return (
        <div className="px-3 py-2 text-xs" style={{ borderLeft: "3px solid var(--color-ink)", backgroundColor: "var(--color-paper)", color: "var(--color-ink)" }}>
          {block.text}
        </div>
      );
    case "star_note":
      return (
        <div className="text-xs" style={{ color: "var(--color-ink)" }}>
          <span style={{ color: "var(--color-green)" }}>★ </span>{block.text}
        </div>
      );
    case "footer_legal":
      return (
        <div className="text-[11px] italic pt-2" style={{ color: "var(--color-muted)" }}>
          {block.text}
        </div>
      );
  }
}
