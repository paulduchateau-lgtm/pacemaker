import {
  Document as DocxDocument,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from "docx";
import ExcelJS from "exceljs";
import type { Week, Task, Risk, Budget } from "@/types";

interface ProjectContext {
  weeks: Week[];
  tasks: Task[];
  risks: Risk[];
  budget: Budget;
  currentWeek: number;
}

interface LivrableSpec {
  titre: string;
  description: string;
  format: string;
}

// ─── Common helpers ────────────────────────────────────

function today(): string {
  return new Date().toISOString().split("T")[0];
}

const INK = "1C1C1A";
const GREEN = "A5D900";
const BORDER_COLOR = "D4D0CA";
const PAPER = "F0EEEB";

// ─── DOCX Generator ───────────────────────────────────

export async function generateDocx(
  livrable: LivrableSpec,
  task: Task,
  week: Week,
  ctx: ProjectContext,
  aiContent: string
): Promise<Buffer> {
  const sections = parseAiContent(aiContent);

  const children: Paragraph[] = [];

  // Header
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "LITE●OPS — Pacemaker",
          font: "DM Sans",
          size: 16,
          color: "8A8680",
        }),
        new TextRun({
          text: `    ${today()}`,
          font: "JetBrains Mono",
          size: 14,
          color: "8A8680",
        }),
      ],
    })
  );

  children.push(
    new Paragraph({ spacing: { after: 200 } })
  );

  // Title
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [
        new TextRun({
          text: livrable.titre,
          font: "DM Sans",
          size: 32,
          color: INK,
        }),
      ],
    })
  );

  // Meta
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `${week.phase} — S${week.id}`,
          font: "JetBrains Mono",
          size: 16,
          color: "8A8680",
        }),
      ],
      spacing: { after: 200 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Tâche : ${task.label}`,
          font: "DM Sans",
          size: 20,
          color: INK,
        }),
      ],
      spacing: { after: 100 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Responsable : ${task.owner}  |  Priorité : ${task.priority}  |  Statut : ${task.status}`,
          font: "JetBrains Mono",
          size: 16,
          color: "8A8680",
        }),
      ],
      spacing: { after: 300 },
    })
  );

  // AI sections
  for (const section of sections) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [
          new TextRun({
            text: section.heading,
            font: "DM Sans",
            size: 26,
            color: INK,
          }),
        ],
        spacing: { before: 300, after: 100 },
      })
    );

    for (const line of section.lines) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line,
              font: "DM Sans",
              size: 20,
              color: INK,
            }),
          ],
          spacing: { after: 80 },
        })
      );
    }
  }

  // Risks section if relevant
  const activeRisks = ctx.risks.filter((r) => r.status === "actif");
  if (activeRisks.length > 0 && shouldIncludeRisks(livrable, aiContent)) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [
          new TextRun({
            text: "Registre des risques",
            font: "DM Sans",
            size: 26,
            color: INK,
          }),
        ],
        spacing: { before: 400, after: 200 },
      })
    );

    const riskTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: ["Risque", "Impact", "Probabilité", "Mitigation"].map(
            (h) =>
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: h,
                        font: "JetBrains Mono",
                        size: 16,
                        bold: false,
                        color: INK,
                      }),
                    ],
                  }),
                ],
                shading: { fill: PAPER },
                borders: cellBorders(),
              })
          ),
        }),
        ...activeRisks.map(
          (r) =>
            new TableRow({
              children: [
                textCell(r.label),
                textCell(`${r.impact}/5`),
                textCell(`${r.probability}/5`),
                textCell(r.mitigation),
              ],
            })
        ),
      ],
    });

    children.push(new Paragraph({ children: [] }));
    children.push(riskTable as unknown as Paragraph);
  }

  // Budget section if relevant
  if (shouldIncludeBudget(livrable, aiContent)) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [
          new TextRun({
            text: "Budget mission",
            font: "DM Sans",
            size: 26,
            color: INK,
          }),
        ],
        spacing: { before: 400, after: 100 },
      })
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Forfait : ${ctx.budget.forfait_ht.toLocaleString("fr-FR")} € HT  |  ${ctx.budget.vendu_jh} jh vendus  |  ${ctx.budget.reel_cible_jh} jh budget réel`,
            font: "JetBrains Mono",
            size: 16,
            color: "8A8680",
          }),
        ],
        spacing: { after: 200 },
      })
    );
  }

  const doc = new DocxDocument({
    sections: [{ children }],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

// ─── XLSX Generator ───────────────────────────────────

export async function generateXlsx(
  livrable: LivrableSpec,
  task: Task,
  week: Week,
  ctx: ProjectContext,
  aiContent: string
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Pacemaker — Lite Ops";
  workbook.created = new Date();

  const sections = parseAiContent(aiContent);

  // Main sheet
  const mainSheet = workbook.addWorksheet(livrable.titre.slice(0, 31));
  mainSheet.columns = [
    { width: 40 },
    { width: 30 },
    { width: 20 },
    { width: 20 },
  ];

  // Header
  mainSheet.addRow([livrable.titre]);
  const titleRow = mainSheet.getRow(1);
  titleRow.font = { name: "DM Sans", size: 14, color: { argb: `FF${INK}` } };
  titleRow.height = 30;

  mainSheet.addRow([
    `${week.phase} — S${week.id}`,
  ]);
  mainSheet.getRow(2).font = {
    name: "JetBrains Mono",
    size: 9,
    color: { argb: "FF8A8680" },
  };

  mainSheet.addRow([`Tâche : ${task.label}`]);
  mainSheet.addRow([
    `Responsable : ${task.owner}`,
    `Priorité : ${task.priority}`,
    `Statut : ${task.status}`,
  ]);
  mainSheet.addRow([]);

  // AI content as rows
  for (const section of sections) {
    const headRow = mainSheet.addRow([section.heading]);
    headRow.font = {
      name: "DM Sans",
      size: 12,
      color: { argb: `FF${INK}` },
    };
    headRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: `FF${PAPER}` },
    };

    for (const line of section.lines) {
      mainSheet.addRow([line]);
    }
    mainSheet.addRow([]);
  }

  // Risks sheet if relevant
  if (
    ctx.risks.length > 0 &&
    shouldIncludeRisks(livrable, aiContent)
  ) {
    const riskSheet = workbook.addWorksheet("Risques");
    riskSheet.columns = [
      { header: "Risque", width: 50 },
      { header: "Impact", width: 10 },
      { header: "Probabilité", width: 12 },
      { header: "Score", width: 10 },
      { header: "Statut", width: 10 },
      { header: "Mitigation", width: 50 },
    ];

    const headerRow = riskSheet.getRow(1);
    headerRow.font = {
      name: "JetBrains Mono",
      size: 9,
      color: { argb: `FF${INK}` },
    };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: `FF${PAPER}` },
    };

    for (const r of ctx.risks) {
      riskSheet.addRow([
        r.label,
        r.impact,
        r.probability,
        r.impact * r.probability,
        r.status,
        r.mitigation,
      ]);
    }
  }

  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}

// ─── PPTX Generator ───────────────────────────────────

export async function generatePptx(
  livrable: LivrableSpec,
  task: Task,
  week: Week,
  ctx: ProjectContext,
  aiContent: string
): Promise<Buffer> {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.author = "Pacemaker — Lite Ops";
  pptx.title = livrable.titre;

  const sections = parseAiContent(aiContent);

  // Title slide
  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: INK };
  titleSlide.addText(livrable.titre, {
    x: 0.5,
    y: 1.5,
    w: 9,
    h: 1.5,
    fontSize: 28,
    color: PAPER,
    fontFace: "DM Sans",
  });
  titleSlide.addText(
    `${week.phase} — S${week.id}`,
    {
      x: 0.5,
      y: 3.2,
      w: 9,
      fontSize: 12,
      color: GREEN,
      fontFace: "JetBrains Mono",
    }
  );
  titleSlide.addText(`Tâche : ${task.label}`, {
    x: 0.5,
    y: 3.8,
    w: 9,
    fontSize: 14,
    color: PAPER,
    fontFace: "DM Sans",
  });
  titleSlide.addText(today(), {
    x: 8,
    y: 0.3,
    w: 1.5,
    fontSize: 10,
    color: "8A8680",
    fontFace: "JetBrains Mono",
    align: "right",
  });

  // Content slides
  for (const section of sections) {
    const slide = pptx.addSlide();
    slide.addText(section.heading, {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.8,
      fontSize: 22,
      color: INK,
      fontFace: "DM Sans",
    });

    const bodyText = section.lines.join("\n");
    slide.addText(bodyText, {
      x: 0.5,
      y: 1.3,
      w: 9,
      h: 4,
      fontSize: 14,
      color: INK,
      fontFace: "DM Sans",
      valign: "top",
      paraSpaceAfter: 6,
    });

    // Footer
    slide.addText("LITE●OPS — Pacemaker", {
      x: 0.5,
      y: 5.2,
      w: 4,
      fontSize: 8,
      color: "8A8680",
      fontFace: "JetBrains Mono",
    });
  }

  // Risks slide if relevant
  const activeRisks = ctx.risks.filter((r) => r.status === "actif");
  if (activeRisks.length > 0 && shouldIncludeRisks(livrable, aiContent)) {
    const riskSlide = pptx.addSlide();
    riskSlide.addText("Registre des risques", {
      x: 0.5,
      y: 0.3,
      w: 9,
      fontSize: 22,
      color: INK,
      fontFace: "DM Sans",
    });

    const riskRows: Array<Array<{ text: string; options?: Record<string, unknown> }>> = [
      [
        { text: "Risque", options: { bold: true, fill: { color: PAPER } } },
        { text: "I", options: { bold: true, fill: { color: PAPER } } },
        { text: "P", options: { bold: true, fill: { color: PAPER } } },
        { text: "Mitigation", options: { bold: true, fill: { color: PAPER } } },
      ],
    ];

    for (const r of activeRisks.slice(0, 7)) {
      riskRows.push([
        { text: r.label },
        { text: `${r.impact}` },
        { text: `${r.probability}` },
        { text: r.mitigation.slice(0, 80) },
      ]);
    }

    riskSlide.addTable(riskRows, {
      x: 0.5,
      y: 1.2,
      w: 9,
      fontSize: 10,
      fontFace: "DM Sans",
      color: INK,
      border: { type: "solid", pt: 0.5, color: BORDER_COLOR },
      colW: [3.5, 0.5, 0.5, 4.5],
    });
  }

  const output = await pptx.write({ outputType: "nodebuffer" });
  return Buffer.from(output as ArrayBuffer);
}

// ─── Helpers ──────────────────────────────────────────

interface ContentSection {
  heading: string;
  lines: string[];
}

function parseAiContent(content: string): ContentSection[] {
  const lines = content.split("\n");
  const sections: ContentSection[] = [];
  let current: ContentSection | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Detect headings (## or numbered like "1. ")
    if (trimmed.startsWith("##") || trimmed.match(/^\d+\.\s+[A-ZÀ-Ü]/)) {
      if (current) sections.push(current);
      current = {
        heading: trimmed.replace(/^#+\s*/, "").replace(/^\d+\.\s*/, ""),
        lines: [],
      };
    } else {
      if (!current) {
        current = { heading: "Contenu", lines: [] };
      }
      current.lines.push(trimmed.replace(/^[-*]\s*/, ""));
    }
  }

  if (current) sections.push(current);
  if (sections.length === 0) {
    sections.push({ heading: "Contenu", lines: [content] });
  }
  return sections;
}

function shouldIncludeRisks(livrable: LivrableSpec, content: string): boolean {
  const keywords = ["risque", "risk", "gouvernance", "pilotage", "audit", "cadrage", "bilan", "clôture", "comité"];
  const haystack = `${livrable.titre} ${livrable.description} ${content}`.toLowerCase();
  return keywords.some((k) => haystack.includes(k));
}

function shouldIncludeBudget(livrable: LivrableSpec, content: string): boolean {
  const keywords = ["budget", "coût", "forfait", "facturation", "échéance", "financ", "bilan", "clôture"];
  const haystack = `${livrable.titre} ${livrable.description} ${content}`.toLowerCase();
  return keywords.some((k) => haystack.includes(k));
}

function cellBorders() {
  const border = {
    style: BorderStyle.SINGLE,
    size: 1,
    color: BORDER_COLOR,
  };
  return { top: border, bottom: border, left: border, right: border };
}

function textCell(text: string): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            font: "DM Sans",
            size: 18,
            color: INK,
          }),
        ],
      }),
    ],
    borders: cellBorders(),
  });
}
