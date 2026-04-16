import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  HeadingLevel,
  AlignmentType,
  PageBreak,
} from "docx";
import type { Block, LivrablePayload } from "../types";
import type { Theme } from "../themes";

const INK_SIZE = 20; // 10pt ×2 (demi-points)

function border(color: string) {
  return {
    top: { style: BorderStyle.SINGLE, size: 4, color },
    bottom: { style: BorderStyle.SINGLE, size: 4, color },
    left: { style: BorderStyle.SINGLE, size: 4, color },
    right: { style: BorderStyle.SINGLE, size: 4, color },
  };
}

function txt(text: string, opts: { font: string; size: number; color?: string; bold?: boolean } & Record<string, unknown>) {
  return new TextRun({ text, font: opts.font, size: opts.size, color: opts.color, bold: opts.bold });
}

function headerBand(theme: Theme): Paragraph {
  if (!theme.headerBand) {
    return new Paragraph({ spacing: { after: 120 }, children: [] });
  }
  // Bandeau violet plein : une ligne remplie via shading + hauteur fixe
  return new Paragraph({
    shading: { type: ShadingType.CLEAR, color: "auto", fill: theme.palette.primary },
    spacing: { before: 0, after: 200 },
    children: [txt(" ", { font: theme.fonts.sans, size: 4 })],
  });
}

function sectionMarkerCell(theme: Theme): TableCell {
  // Carré rempli accent — 0,6 cm × 0,6 cm (340 twip ≈ 0,6 cm)
  return new TableCell({
    width: { size: 340, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, color: "auto", fill: theme.palette.accent },
    borders: border(theme.palette.accent),
    children: [new Paragraph({ children: [txt(" ", { font: theme.fonts.sans, size: 2 })] })],
  });
}

function headingLevel(level: 1 | 2 | 3): (typeof HeadingLevel)[keyof typeof HeadingLevel] {
  return level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3;
}

function sizeFor(level: 1 | 2 | 3): number {
  return level === 1 ? 44 : level === 2 ? 32 : 26; // demi-points
}

function renderSection(theme: Theme, level: 1 | 2 | 3, title: string): Paragraph | Table {
  if (theme.sectionMarker === "square" && level === 1) {
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      },
      rows: [
        new TableRow({
          children: [
            sectionMarkerCell(theme),
            new TableCell({
              borders: border("FFFFFF"),
              children: [
                new Paragraph({
                  spacing: { before: 200, after: 100 },
                  children: [txt(`  ${title}`, { font: theme.fonts.sans, size: sizeFor(level), color: theme.palette.primary, bold: true })],
                }),
              ],
            }),
          ],
        }),
      ],
    });
  }
  return new Paragraph({
    heading: headingLevel(level),
    spacing: { before: level === 1 ? 400 : 300, after: 100 },
    children: [txt(title, { font: theme.fonts.sans, size: sizeFor(level), color: theme.palette.primary, bold: true })],
  });
}

function renderCover(theme: Theme, b: Extract<Block, { kind: "cover" }>): Paragraph[] {
  const out: Paragraph[] = [];
  if (theme.headerBand) out.push(headerBand(theme));
  out.push(
    new Paragraph({
      spacing: { before: 400, after: 200 },
      children: [txt(b.title, { font: theme.fonts.sans, size: 56, color: theme.palette.primary, bold: true })],
    })
  );
  if (b.subtitle) {
    out.push(
      new Paragraph({
        spacing: { after: 400 },
        children: [txt(b.subtitle, { font: theme.fonts.sans, size: 28, color: theme.palette.ink })],
      })
    );
  }
  const meta = b.meta;
  if (meta) {
    const lines: string[] = [];
    if (meta.client) lines.push(`Destinataire : ${meta.client}`);
    if (meta.emitter) lines.push(`Émetteur : ${meta.emitter}`);
    if (meta.date) lines.push(`Date : ${meta.date}`);
    if (meta.version) lines.push(`Version : ${meta.version}`);
    if (meta.confidential) lines.push(`Confidentialité : ${meta.confidential}`);
    for (const l of lines) {
      out.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [txt(l, { font: theme.fonts.sans, size: 22, color: theme.palette.muted })],
        })
      );
    }
  }
  out.push(new Paragraph({ children: [new PageBreak()] }));
  return out;
}

function renderKpiGrid(theme: Theme, b: Extract<Block, { kind: "kpi_grid" }>): Table {
  const tintFor = (t: string) => (t === "positive" ? theme.palette.tintPositive : t === "critical" ? theme.palette.tintCritical : theme.palette.emphasis);
  const barFor = (t: string) => (t === "positive" ? theme.palette.accent : t === "critical" ? theme.palette.alert : theme.palette.primary);
  const cellWidth = Math.floor(100 / b.cols);
  const rows: TableRow[] = [];
  for (let i = 0; i < b.cards.length; i += b.cols) {
    const rowCards = b.cards.slice(i, i + b.cols);
    rows.push(
      new TableRow({
        children: rowCards.map((c) => {
          return new TableCell({
            width: { size: cellWidth, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, color: "auto", fill: tintFor(c.tone) },
            borders: {
              ...border(tintFor(c.tone)),
              left: { style: BorderStyle.SINGLE, size: 24, color: barFor(c.tone) },
            },
            margins: { top: 120, bottom: 120, left: 120, right: 120 },
            children: [
              new Paragraph({
                children: [txt(c.label.toUpperCase(), { font: theme.fonts.mono, size: 16, color: theme.palette.muted })],
                spacing: { after: 60 },
              }),
              new Paragraph({
                children: [txt(c.value, { font: theme.fonts.sans, size: 48, color: theme.palette.primary, bold: true })],
                spacing: { after: 40 },
              }),
              c.delta
                ? new Paragraph({
                    children: [
                      txt(c.delta, {
                        font: theme.fonts.mono,
                        size: 16,
                        color: c.tone === "critical" ? theme.palette.alert : c.tone === "positive" ? theme.palette.positive : theme.palette.muted,
                      }),
                    ],
                  })
                : new Paragraph({ children: [] }),
            ],
          });
        }),
      })
    );
  }
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });
}

function renderTable(theme: Theme, b: Extract<Block, { kind: "table" }>): Table {
  const head = new TableRow({
    tableHeader: true,
    children: b.headers.map(
      (h) =>
        new TableCell({
          shading: { type: ShadingType.CLEAR, color: "auto", fill: theme.palette.primary },
          borders: border(theme.palette.primary),
          children: [new Paragraph({ children: [txt(h, { font: theme.fonts.sans, size: 20, color: theme.palette.paper, bold: true })] })],
        })
    ),
  });
  const dataRows = b.rows.map(
    (row, i) =>
      new TableRow({
        children: row.map((cell) => {
          const value = typeof cell === "string" ? cell : cell.value;
          const tone = typeof cell === "string" ? "neutral" : cell.tone ?? "neutral";
          const color = tone === "critical" ? theme.palette.alert : tone === "positive" ? theme.palette.positive : theme.palette.ink;
          return new TableCell({
            shading: { type: ShadingType.CLEAR, color: "auto", fill: i % 2 === 0 ? theme.palette.paper : theme.palette.zebra },
            borders: border(theme.palette.border),
            children: [new Paragraph({ children: [txt(value, { font: theme.fonts.sans, size: INK_SIZE, color })] })],
          });
        }),
      })
  );
  const totalsRow = b.totals
    ? new TableRow({
        children: b.totals.map(
          (t) =>
            new TableCell({
              shading: { type: ShadingType.CLEAR, color: "auto", fill: theme.palette.emphasis },
              borders: border(theme.palette.border),
              children: [new Paragraph({ children: [txt(t, { font: theme.fonts.sans, size: INK_SIZE, color: theme.palette.primary, bold: true })] })],
            })
        ),
      })
    : null;
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: totalsRow ? [head, ...dataRows, totalsRow] : [head, ...dataRows],
  });
}

function renderCallout(theme: Theme, b: Extract<Block, { kind: "callout" }>): Table {
  const tint = b.tone === "positive" ? theme.palette.tintPositive : b.tone === "critical" ? theme.palette.tintCritical : theme.palette.emphasis;
  const bar = b.tone === "positive" ? theme.palette.accent : b.tone === "critical" ? theme.palette.alert : theme.palette.primary;
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, color: "auto", fill: tint },
            borders: { ...border(tint), left: { style: BorderStyle.SINGLE, size: 32, color: bar } },
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            children: [new Paragraph({ children: [txt(b.text, { font: theme.fonts.sans, size: INK_SIZE, color: theme.palette.ink })] })],
          }),
        ],
      }),
    ],
  });
}

function renderBlock(theme: Theme, b: Block): Array<Paragraph | Table> {
  switch (b.kind) {
    case "cover":
      return renderCover(theme, b);
    case "toc":
      return [
        new Paragraph({
          spacing: { before: 200, after: 100 },
          children: [txt("Sommaire", { font: theme.fonts.sans, size: 32, color: theme.palette.primary, bold: true })],
        }),
        ...b.items.map(
          (item, i) =>
            new Paragraph({
              spacing: { after: 80 },
              children: [
                txt(`${String(i + 1).padStart(2, "0")}  `, { font: theme.fonts.mono, size: 20, color: theme.palette.muted }),
                txt(item, { font: theme.fonts.sans, size: INK_SIZE, color: theme.palette.ink }),
              ],
            })
        ),
      ];
    case "section":
      return [renderSection(theme, b.level, b.title)];
    case "paragraph":
      return [
        new Paragraph({
          spacing: { after: 120 },
          children: [txt(b.text, { font: theme.fonts.sans, size: INK_SIZE, color: theme.palette.ink, bold: b.emphasis === true })],
        }),
      ];
    case "bullet_list":
      return b.items.map(
        (it) =>
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 60 },
            children: [txt(it, { font: theme.fonts.sans, size: INK_SIZE, color: theme.palette.ink })],
          })
      );
    case "numbered_list":
      return b.items.map(
        (it, i) =>
          new Paragraph({
            spacing: { after: 60 },
            children: [
              txt(`${i + 1}. `, { font: theme.fonts.mono, size: INK_SIZE, color: theme.palette.muted }),
              txt(it, { font: theme.fonts.sans, size: INK_SIZE, color: theme.palette.ink }),
            ],
          })
      );
    case "kpi_grid":
      return [renderKpiGrid(theme, b)];
    case "table":
      return [renderTable(theme, b)];
    case "callout":
      return [renderCallout(theme, b)];
    case "star_note":
      return [
        new Paragraph({
          spacing: { before: 100, after: 100 },
          children: [
            txt("★  ", { font: theme.fonts.sans, size: 24, color: theme.palette.accent, bold: true }),
            txt(b.text, { font: theme.fonts.sans, size: INK_SIZE, color: theme.palette.ink }),
          ],
        }),
      ];
    case "footer_legal":
      return [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 400 },
          children: [txt(b.text, { font: theme.fonts.sans, size: 16, color: theme.palette.muted })],
        }),
      ];
  }
}

export async function renderDocx(payload: LivrablePayload, theme: Theme): Promise<Buffer> {
  const children: Array<Paragraph | Table> = [];
  const blocks = payload.blocks ?? [];
  const hasFooter = blocks.some((b) => b.kind === "footer_legal");
  for (const b of blocks) {
    for (const el of renderBlock(theme, b)) children.push(el);
  }
  if (!hasFooter && theme.defaultLegal) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 400 },
        children: [txt(theme.defaultLegal, { font: theme.fonts.sans, size: 16, color: theme.palette.muted })],
      })
    );
  }
  const doc = new Document({ sections: [{ children }] });
  return Buffer.from(await Packer.toBuffer(doc));
}
