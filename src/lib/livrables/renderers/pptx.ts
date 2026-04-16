import pptxgen from "pptxgenjs";
import type { Block, LivrablePayload } from "../types";
import type { Theme } from "../themes";

const W = 10; // inch (slide width 16:9)
const H = 5.625;
const MARGIN = 0.5;

function hex(c: string): string {
  return c.toUpperCase();
}

function slideHeaderBand(slide: pptxgen.Slide, theme: Theme) {
  if (!theme.headerBand) return;
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: W,
    h: 0.12,
    fill: { color: hex(theme.palette.primary) },
    line: { color: hex(theme.palette.primary), width: 0 },
  });
}

function slideFooter(slide: pptxgen.Slide, theme: Theme, text: string) {
  slide.addText(text, {
    x: MARGIN,
    y: H - 0.35,
    w: W - 2 * MARGIN,
    h: 0.25,
    fontFace: theme.fonts.sans,
    fontSize: 8,
    color: hex(theme.palette.muted),
    align: "center",
    italic: true,
  });
}

function sectionMarker(slide: pptxgen.Slide, theme: Theme, title: string, size: number) {
  const markerSize = 0.35;
  if (theme.sectionMarker === "square") {
    slide.addShape("rect", {
      x: MARGIN,
      y: MARGIN + 0.08,
      w: markerSize,
      h: markerSize,
      fill: { color: hex(theme.palette.accent) },
      line: { color: hex(theme.palette.accent), width: 0 },
    });
    slide.addText(title, {
      x: MARGIN + markerSize + 0.2,
      y: MARGIN,
      w: W - MARGIN - markerSize - 0.4,
      h: 0.6,
      fontFace: theme.fonts.sans,
      fontSize: size,
      color: hex(theme.palette.primary),
      bold: true,
    });
  } else {
    slide.addText(title, {
      x: MARGIN,
      y: MARGIN,
      w: W - 2 * MARGIN,
      h: 0.6,
      fontFace: theme.fonts.sans,
      fontSize: size,
      color: hex(theme.palette.primary),
      bold: true,
    });
  }
  // Filet sous le titre
  slide.addShape("line", {
    x: MARGIN,
    y: MARGIN + 0.7,
    w: W - 2 * MARGIN,
    h: 0,
    line: { color: hex(theme.palette.primary), width: 1.5 },
  });
}

function addCoverSlide(pres: pptxgen, theme: Theme, b: Extract<Block, { kind: "cover" }>): void {
  const slide = pres.addSlide();
  slideHeaderBand(slide, theme);
  if (theme.sectionMarker === "square") {
    slide.addShape("rect", {
      x: MARGIN,
      y: 1.4,
      w: 0.5,
      h: 0.5,
      fill: { color: hex(theme.palette.accent) },
      line: { color: hex(theme.palette.accent), width: 0 },
    });
  }
  slide.addText(b.title, {
    x: MARGIN,
    y: 2.1,
    w: W - 2 * MARGIN,
    h: 1.2,
    fontFace: theme.fonts.sans,
    fontSize: 32,
    bold: true,
    color: hex(theme.palette.primary),
  });
  if (b.subtitle) {
    slide.addText(b.subtitle, {
      x: MARGIN,
      y: 3.2,
      w: W - 2 * MARGIN,
      h: 0.6,
      fontFace: theme.fonts.sans,
      fontSize: 18,
      color: hex(theme.palette.ink),
    });
  }
  const meta = b.meta;
  if (meta) {
    const lines: string[] = [];
    if (meta.client) lines.push(`Destinataire : ${meta.client}`);
    if (meta.emitter) lines.push(`Émetteur : ${meta.emitter}`);
    if (meta.date) lines.push(`Date : ${meta.date}`);
    if (meta.version) lines.push(`Version : ${meta.version}`);
    slide.addText(lines.join("\n"), {
      x: MARGIN,
      y: 4.1,
      w: W - 2 * MARGIN,
      h: 1,
      fontFace: theme.fonts.sans,
      fontSize: 10,
      color: hex(theme.palette.muted),
    });
  }
  if (meta?.confidential) slideFooter(slide, theme, meta.confidential);
  else if (theme.defaultLegal) slideFooter(slide, theme, theme.defaultLegal);
}

function addSectionSlide(pres: pptxgen, theme: Theme, title: string, body: Block[]): void {
  const slide = pres.addSlide();
  slideHeaderBand(slide, theme);
  sectionMarker(slide, theme, title, 24);
  let y = 1.5;
  for (const b of body) {
    if (y > H - 0.7) break;
    switch (b.kind) {
      case "paragraph":
        slide.addText(b.text, {
          x: MARGIN,
          y,
          w: W - 2 * MARGIN,
          h: 0.5,
          fontFace: theme.fonts.sans,
          fontSize: 11,
          color: hex(theme.palette.ink),
          bold: b.emphasis === true,
        });
        y += 0.55;
        break;
      case "bullet_list":
        slide.addText(b.items.map((t) => ({ text: t, options: { bullet: true } })), {
          x: MARGIN,
          y,
          w: W - 2 * MARGIN,
          h: b.items.length * 0.35,
          fontFace: theme.fonts.sans,
          fontSize: 11,
          color: hex(theme.palette.ink),
        });
        y += b.items.length * 0.35 + 0.15;
        break;
      case "numbered_list":
        slide.addText(
          b.items.map((t, i) => ({ text: `${i + 1}. ${t}`, options: {} })),
          {
            x: MARGIN,
            y,
            w: W - 2 * MARGIN,
            h: b.items.length * 0.35,
            fontFace: theme.fonts.sans,
            fontSize: 11,
            color: hex(theme.palette.ink),
          }
        );
        y += b.items.length * 0.35 + 0.15;
        break;
      case "kpi_grid": {
        const colW = (W - 2 * MARGIN) / b.cols;
        const cardH = 1.2;
        b.cards.forEach((c, idx) => {
          const col = idx % b.cols;
          const row = Math.floor(idx / b.cols);
          const cx = MARGIN + col * colW;
          const cy = y + row * (cardH + 0.15);
          const tint =
            c.tone === "positive" ? theme.palette.tintPositive : c.tone === "critical" ? theme.palette.tintCritical : theme.palette.emphasis;
          const bar = c.tone === "positive" ? theme.palette.accent : c.tone === "critical" ? theme.palette.alert : theme.palette.primary;
          slide.addShape("rect", {
            x: cx + 0.05,
            y: cy,
            w: colW - 0.1,
            h: cardH,
            fill: { color: hex(tint) },
            line: { color: hex(tint), width: 0 },
          });
          slide.addShape("rect", {
            x: cx + 0.05,
            y: cy,
            w: 0.08,
            h: cardH,
            fill: { color: hex(bar) },
            line: { color: hex(bar), width: 0 },
          });
          slide.addText(c.label.toUpperCase(), {
            x: cx + 0.2,
            y: cy + 0.1,
            w: colW - 0.3,
            h: 0.25,
            fontFace: theme.fonts.mono,
            fontSize: 9,
            color: hex(theme.palette.muted),
          });
          slide.addText(c.value, {
            x: cx + 0.2,
            y: cy + 0.35,
            w: colW - 0.3,
            h: 0.55,
            fontFace: theme.fonts.sans,
            fontSize: 24,
            bold: true,
            color: hex(theme.palette.primary),
          });
          if (c.delta) {
            const color = c.tone === "critical" ? theme.palette.alert : c.tone === "positive" ? theme.palette.positive : theme.palette.muted;
            slide.addText(c.delta, {
              x: cx + 0.2,
              y: cy + 0.9,
              w: colW - 0.3,
              h: 0.25,
              fontFace: theme.fonts.mono,
              fontSize: 9,
              color: hex(color),
            });
          }
        });
        const rows = Math.ceil(b.cards.length / b.cols);
        y += rows * (cardH + 0.15) + 0.1;
        break;
      }
      case "table": {
        const rows: pptxgen.TableRow[] = [];
        rows.push(
          b.headers.map((h) => ({
            text: h,
            options: {
              bold: true,
              color: hex(theme.palette.paper),
              fill: { color: hex(theme.palette.primary) },
              fontFace: theme.fonts.sans,
              fontSize: 10,
            },
          }))
        );
        b.rows.forEach((r, idx) => {
          rows.push(
            r.map((cell) => {
              const value = typeof cell === "string" ? cell : cell.value;
              const tone = typeof cell === "string" ? "neutral" : cell.tone ?? "neutral";
              const color = tone === "critical" ? theme.palette.alert : tone === "positive" ? theme.palette.positive : theme.palette.ink;
              return {
                text: value,
                options: {
                  color: hex(color),
                  fill: { color: hex(idx % 2 === 0 ? theme.palette.paper : theme.palette.zebra) },
                  fontFace: theme.fonts.sans,
                  fontSize: 10,
                },
              };
            })
          );
        });
        if (b.totals) {
          rows.push(
            b.totals.map((t) => ({
              text: t,
              options: {
                bold: true,
                color: hex(theme.palette.primary),
                fill: { color: hex(theme.palette.emphasis) },
                fontFace: theme.fonts.sans,
                fontSize: 10,
              },
            }))
          );
        }
        slide.addTable(rows, { x: MARGIN, y, w: W - 2 * MARGIN, colW: Array(b.headers.length).fill((W - 2 * MARGIN) / b.headers.length) });
        y += rows.length * 0.3 + 0.2;
        break;
      }
      case "callout": {
        const tint = b.tone === "positive" ? theme.palette.tintPositive : b.tone === "critical" ? theme.palette.tintCritical : theme.palette.emphasis;
        const bar = b.tone === "positive" ? theme.palette.accent : b.tone === "critical" ? theme.palette.alert : theme.palette.primary;
        slide.addShape("rect", {
          x: MARGIN,
          y,
          w: W - 2 * MARGIN,
          h: 0.8,
          fill: { color: hex(tint) },
          line: { color: hex(tint), width: 0 },
        });
        slide.addShape("rect", {
          x: MARGIN,
          y,
          w: 0.1,
          h: 0.8,
          fill: { color: hex(bar) },
          line: { color: hex(bar), width: 0 },
        });
        slide.addText(b.text, {
          x: MARGIN + 0.25,
          y: y + 0.1,
          w: W - 2 * MARGIN - 0.35,
          h: 0.6,
          fontFace: theme.fonts.sans,
          fontSize: 11,
          color: hex(theme.palette.ink),
        });
        y += 1;
        break;
      }
      case "star_note":
        slide.addText(`★  ${b.text}`, {
          x: MARGIN,
          y,
          w: W - 2 * MARGIN,
          h: 0.4,
          fontFace: theme.fonts.sans,
          fontSize: 11,
          color: hex(theme.palette.accent),
          bold: true,
        });
        y += 0.5;
        break;
      default:
        break;
    }
  }
  slideFooter(slide, theme, theme.defaultLegal);
}

function addTocSlide(pres: pptxgen, theme: Theme, items: string[]): void {
  const slide = pres.addSlide();
  slideHeaderBand(slide, theme);
  sectionMarker(slide, theme, "Sommaire", 24);
  const lines = items.map((t, i) => ({ text: `${String(i + 1).padStart(2, "0")}   ${t}`, options: {} }));
  slide.addText(lines, {
    x: MARGIN,
    y: 1.5,
    w: W - 2 * MARGIN,
    h: H - 2.2,
    fontFace: theme.fonts.sans,
    fontSize: 14,
    color: hex(theme.palette.ink),
    paraSpaceAfter: 10,
  });
  slideFooter(slide, theme, theme.defaultLegal);
}

/**
 * Découpage en slides : chaque `section` (level 1) démarre une slide.
 * Les blocs qui suivent une section sont rendus dans la même slide jusqu'à la prochaine section.
 */
function groupIntoSlides(blocks: Block[]): { title: string; body: Block[] }[] {
  const slides: { title: string; body: Block[] }[] = [];
  let current: { title: string; body: Block[] } | null = null;
  for (const b of blocks) {
    if (b.kind === "section" && b.level === 1) {
      if (current) slides.push(current);
      current = { title: b.title, body: [] };
      continue;
    }
    if (b.kind === "cover" || b.kind === "toc" || b.kind === "footer_legal") continue;
    if (!current) current = { title: "Introduction", body: [] };
    current.body.push(b);
  }
  if (current) slides.push(current);
  return slides;
}

export async function renderPptx(payload: LivrablePayload, theme: Theme): Promise<Buffer> {
  const pres = new pptxgen();
  pres.defineLayout({ name: "LITE16x9", width: W, height: H });
  pres.layout = "LITE16x9";

  const blocks = payload.blocks ?? [];
  const cover = blocks.find((b) => b.kind === "cover") as Extract<Block, { kind: "cover" }> | undefined;
  if (cover) addCoverSlide(pres, theme, cover);
  const toc = blocks.find((b) => b.kind === "toc") as Extract<Block, { kind: "toc" }> | undefined;
  if (toc) addTocSlide(pres, theme, toc.items);

  const groups = groupIntoSlides(blocks);
  for (const g of groups) addSectionSlide(pres, theme, g.title, g.body);

  const buf = (await pres.write({ outputType: "nodebuffer" })) as unknown as Buffer;
  return buf;
}
