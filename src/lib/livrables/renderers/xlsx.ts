import ExcelJS from "exceljs";
import type { Block, LivrablePayload, Sheet } from "../types";
import type { Theme } from "../themes";

function argb(hex: string): string {
  return `FF${hex.toUpperCase()}`;
}

function sectionHeader(ws: ExcelJS.Worksheet, theme: Theme, title: string, row: number, level: 1 | 2 | 3) {
  const size = level === 1 ? 16 : level === 2 ? 13 : 11;
  if (theme.sectionMarker === "square" && level === 1) {
    const markerCell = ws.getCell(row, 1);
    markerCell.value = " ";
    markerCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(theme.palette.accent) } };
    const titleCell = ws.getCell(row, 2);
    titleCell.value = title;
    titleCell.font = { name: theme.fonts.sans, size, bold: true, color: { argb: argb(theme.palette.primary) } };
    ws.getRow(row).height = 22;
  } else {
    const titleCell = ws.getCell(row, 1);
    titleCell.value = title;
    titleCell.font = { name: theme.fonts.sans, size, bold: true, color: { argb: argb(theme.palette.primary) } };
  }
}

function renderCoverSheet(wb: ExcelJS.Workbook, theme: Theme, payload: LivrablePayload, cover?: Extract<Block, { kind: "cover" }>) {
  const ws = wb.addWorksheet("Lisez-moi");
  ws.columns = [{ width: 30 }, { width: 60 }];
  let r = 1;
  ws.getCell(r, 1).value = (cover?.title ?? payload.title).toString();
  ws.getCell(r, 1).font = { name: theme.fonts.sans, size: 18, bold: true, color: { argb: argb(theme.palette.primary) } };
  ws.getRow(r).height = 28;
  r += 2;
  const meta = cover?.meta;
  if (meta) {
    const entries: [string, string | undefined][] = [
      ["Client", meta.client],
      ["Émetteur", meta.emitter],
      ["Date", meta.date],
      ["Version", meta.version],
      ["Confidentialité", meta.confidential],
    ];
    for (const [k, v] of entries) {
      if (!v) continue;
      ws.getCell(r, 1).value = k;
      ws.getCell(r, 1).font = { name: theme.fonts.mono, size: 10, color: { argb: argb(theme.palette.muted) } };
      ws.getCell(r, 2).value = v;
      ws.getCell(r, 2).font = { name: theme.fonts.sans, size: 11, color: { argb: argb(theme.palette.ink) } };
      r += 1;
    }
  }
}

function renderKpiGrid(ws: ExcelJS.Worksheet, theme: Theme, b: Extract<Block, { kind: "kpi_grid" }>, startRow: number): number {
  const tintFor = (t: string) => (t === "positive" ? theme.palette.tintPositive : t === "critical" ? theme.palette.tintCritical : theme.palette.emphasis);
  const colorFor = (t: string) => (t === "positive" ? theme.palette.positive : t === "critical" ? theme.palette.alert : theme.palette.primary);
  let row = startRow;
  for (let i = 0; i < b.cards.length; i += b.cols) {
    const batch = b.cards.slice(i, i + b.cols);
    batch.forEach((c, j) => {
      const col = 1 + j * 2;
      const labelCell = ws.getCell(row, col);
      labelCell.value = c.label.toUpperCase();
      labelCell.font = { name: theme.fonts.mono, size: 9, color: { argb: argb(theme.palette.muted) } };
      labelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(tintFor(c.tone)) } };
      const valueCell = ws.getCell(row + 1, col);
      valueCell.value = c.value;
      valueCell.font = { name: theme.fonts.sans, size: 20, bold: true, color: { argb: argb(theme.palette.primary) } };
      valueCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(tintFor(c.tone)) } };
      if (c.delta) {
        const deltaCell = ws.getCell(row + 2, col);
        deltaCell.value = c.delta;
        deltaCell.font = { name: theme.fonts.mono, size: 9, color: { argb: argb(colorFor(c.tone)) } };
        deltaCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(tintFor(c.tone)) } };
      }
    });
    row += 4;
  }
  return row;
}

function renderTable(ws: ExcelJS.Worksheet, theme: Theme, b: Extract<Block, { kind: "table" }>, startRow: number): number {
  let row = startRow;
  b.headers.forEach((h, i) => {
    const cell = ws.getCell(row, i + 1);
    cell.value = h;
    cell.font = { name: theme.fonts.sans, size: 11, bold: true, color: { argb: argb(theme.palette.paper) } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(theme.palette.primary) } };
  });
  row += 1;
  b.rows.forEach((r, idx) => {
    r.forEach((cellV, i) => {
      const value = typeof cellV === "string" ? cellV : cellV.value;
      const tone = typeof cellV === "string" ? "neutral" : cellV.tone ?? "neutral";
      const color = tone === "critical" ? theme.palette.alert : tone === "positive" ? theme.palette.positive : theme.palette.ink;
      const c = ws.getCell(row, i + 1);
      c.value = value;
      c.font = { name: theme.fonts.sans, size: 10, color: { argb: argb(color) } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(idx % 2 === 0 ? theme.palette.paper : theme.palette.zebra) } };
    });
    row += 1;
  });
  if (b.totals) {
    b.totals.forEach((t, i) => {
      const c = ws.getCell(row, i + 1);
      c.value = t;
      c.font = { name: theme.fonts.sans, size: 10, bold: true, color: { argb: argb(theme.palette.primary) } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(theme.palette.emphasis) } };
    });
    row += 1;
  }
  return row;
}

function renderBlocksIntoSheet(ws: ExcelJS.Worksheet, theme: Theme, blocks: Block[]) {
  let row = 1;
  for (const b of blocks) {
    switch (b.kind) {
      case "cover":
        // cover déjà sur l'onglet Lisez-moi
        continue;
      case "toc":
        b.items.forEach((item) => {
          const c = ws.getCell(row, 1);
          c.value = `→  ${item}`;
          c.font = { name: theme.fonts.sans, size: 11, color: { argb: argb(theme.palette.ink) } };
          row += 1;
        });
        row += 1;
        break;
      case "section":
        sectionHeader(ws, theme, b.title, row, b.level);
        row += 2;
        break;
      case "paragraph": {
        const c = ws.getCell(row, 1);
        c.value = b.text;
        c.font = { name: theme.fonts.sans, size: 10, color: { argb: argb(theme.palette.ink) }, bold: b.emphasis === true };
        row += 1;
        break;
      }
      case "bullet_list":
        b.items.forEach((it) => {
          const c = ws.getCell(row, 1);
          c.value = `•  ${it}`;
          c.font = { name: theme.fonts.sans, size: 10, color: { argb: argb(theme.palette.ink) } };
          row += 1;
        });
        row += 1;
        break;
      case "numbered_list":
        b.items.forEach((it, i) => {
          const c = ws.getCell(row, 1);
          c.value = `${i + 1}.  ${it}`;
          c.font = { name: theme.fonts.sans, size: 10, color: { argb: argb(theme.palette.ink) } };
          row += 1;
        });
        row += 1;
        break;
      case "kpi_grid":
        row = renderKpiGrid(ws, theme, b, row) + 1;
        break;
      case "table":
        row = renderTable(ws, theme, b, row) + 1;
        break;
      case "callout": {
        const tint = b.tone === "positive" ? theme.palette.tintPositive : b.tone === "critical" ? theme.palette.tintCritical : theme.palette.emphasis;
        const c = ws.getCell(row, 1);
        c.value = b.text;
        c.font = { name: theme.fonts.sans, size: 10, color: { argb: argb(theme.palette.ink) } };
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(tint) } };
        row += 2;
        break;
      }
      case "star_note": {
        const c = ws.getCell(row, 1);
        c.value = `★  ${b.text}`;
        c.font = { name: theme.fonts.sans, size: 10, color: { argb: argb(theme.palette.accent) }, bold: true };
        row += 2;
        break;
      }
      case "footer_legal": {
        const c = ws.getCell(row, 1);
        c.value = b.text;
        c.font = { name: theme.fonts.sans, size: 9, italic: true, color: { argb: argb(theme.palette.muted) } };
        row += 1;
        break;
      }
    }
  }
}

function configureSheet(ws: ExcelJS.Worksheet) {
  ws.columns = [{ width: 6 }, { width: 40 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 30 }];
}

export async function renderXlsx(payload: LivrablePayload, theme: Theme): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Pacemaker — Lite Ops";
  wb.created = new Date();

  const coverBlock = payload.blocks?.find((b) => b.kind === "cover") as
    | Extract<Block, { kind: "cover" }>
    | undefined;
  const hasSheets = payload.sheets && payload.sheets.length > 0;

  if (coverBlock || hasSheets) renderCoverSheet(wb, theme, payload, coverBlock);

  if (hasSheets) {
    for (const s of payload.sheets as Sheet[]) {
      const ws = wb.addWorksheet(s.name.slice(0, 31));
      configureSheet(ws);
      renderBlocksIntoSheet(ws, theme, s.blocks);
    }
  } else {
    const ws = wb.addWorksheet(payload.title.slice(0, 31));
    configureSheet(ws);
    renderBlocksIntoSheet(ws, theme, payload.blocks ?? []);
  }
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
