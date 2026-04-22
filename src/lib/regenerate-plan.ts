/**
 * Logique serveur de régénération du plan par phases.
 * Utilisé par l'API /api/llm/regenerate-plan et le script CLI.
 *
 * Injecte le RAG (documents uploadés), les risques, les décisions et
 * événements pour que le plan reflète les inputs réels de la mission.
 */
import { execute, query } from "@/lib/db";
import { getRelevantContext } from "@/lib/rag";
import { getRelevantRules } from "@/lib/rules";
import { buildRulesBlock } from "@/lib/rules";
import type { InValue } from "@libsql/client";
import Anthropic from "@anthropic-ai/sdk";

function iv(v: unknown): InValue {
  if (v == null) return null;
  if (typeof v === "string" || typeof v === "number" || typeof v === "bigint") return v as InValue;
  return String(v);
}

type Row = Record<string, unknown>;

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

interface PhaseContent {
  weeks: {
    week_id: number;
    week_title: string;
    tasks: { label: string; owner: string; priority: string; description?: string }[];
    livrables: { label: string; format: string }[];
  }[];
}

async function loadMissionInputs(missionId: string): Promise<{
  risks: string;
  decisions: string;
  events: string;
}> {
  const riskRows = await query(
    "SELECT label, impact, probability, mitigation FROM risks WHERE mission_id = ? AND status = 'actif'",
    [missionId],
  ) as Row[];
  const risks = riskRows.length > 0
    ? riskRows.map(r => `- ${r.label} (impact: ${r.impact}/5, proba: ${r.probability}/5) → ${r.mitigation ?? ""}`).join("\n")
    : "(aucun)";

  const decisionRows = await query(
    "SELECT label, content, date FROM events WHERE mission_id = ? AND type = 'decision' ORDER BY date DESC LIMIT 15",
    [missionId],
  ) as Row[];
  const decisions = decisionRows.length > 0
    ? decisionRows.map(d => `- [${d.date}] ${d.label}${d.content ? ` — ${d.content}` : ""}`).join("\n")
    : "(aucune)";

  const eventRows = await query(
    "SELECT type, label, date FROM events WHERE mission_id = ? ORDER BY date DESC LIMIT 20",
    [missionId],
  ) as Row[];
  const events = eventRows.length > 0
    ? eventRows.map(e => `- [${e.type}] ${e.label}`).join("\n")
    : "(aucun)";

  return { risks, decisions, events };
}

async function generatePhaseContent(
  anthropic: Anthropic,
  missionContext: string,
  phaseLabel: string,
  phaseStart: string | null,
  phaseEnd: string | null,
  phaseWeeks: Row[],
  ragContext: string,
  rulesBlock: string,
  inputs: { risks: string; decisions: string; events: string },
): Promise<PhaseContent> {
  const weeksDesc = phaseWeeks
    .map(w => `  - Semaine ${w.id} «${w.title}» (${w.start_date} → ${w.end_date})`)
    .join("\n");

  const resp = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    messages: [{
      role: "user",
      content: `Tu génères le plan de travail d'une phase d'une mission de consulting.

=== CONTEXTE MISSION ===
${missionContext}
=== FIN CONTEXTE ===
${ragContext}
${rulesBlock}
RISQUES ACTIFS :
${inputs.risks}

DÉCISIONS PRISES (à respecter impérativement) :
${inputs.decisions}

ÉVÉNEMENTS RÉCENTS :
${inputs.events}

Phase : ${phaseLabel} (${phaseStart} → ${phaseEnd})
Semaines :
${weeksDesc}

CONSIGNES :
- Génère des tâches concrètes et actionnables qui tiennent compte du contexte
  documentaire ci-dessus (CRs, specs, documents uploadés).
- 4 à 6 tâches par semaine. Owners autorisés : "Paul", "Paul B.", "Client".
- 1 à 3 livrables formels par semaine.
- Priorités : "haute" | "moyenne" | "basse".
- Si un risque actif concerne cette phase, prévois des tâches de mitigation.
- Si une décision modifie le périmètre, adapte le plan en conséquence.

Réponds UNIQUEMENT avec du JSON :
{"weeks":[{"week_id":<int>,"week_title":"<titre>","tasks":[{"label":"...","owner":"...","priority":"...","description":"..."}],"livrables":[{"label":"...","format":"..."}]}]}`,
    }],
  });

  const text = resp.content[0].type === "text" ? resp.content[0].text : "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`JSON absent pour phase ${phaseLabel}`);
  return JSON.parse(match[0]) as PhaseContent;
}

export async function regeneratePlan(missionId: string): Promise<{ tasks: number; livrables: number }> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY manquant");
  const anthropic = new Anthropic({ apiKey });

  const mRows = await query("SELECT context FROM missions WHERE id = ? LIMIT 1", [missionId]) as Row[];
  const missionContext = String(mRows[0]?.context ?? "");

  const phases = await query(
    "SELECT id, label, order_index, start_date, end_date FROM phases WHERE mission_id = ? ORDER BY order_index",
    [missionId],
  ) as Row[];
  const weeks = await query(
    "SELECT id, title, phase_id, start_date, end_date FROM weeks WHERE mission_id = ? ORDER BY id",
    [missionId],
  ) as Row[];

  const inputs = await loadMissionInputs(missionId);

  // Effacement
  await execute("DELETE FROM deliverable_iterations WHERE mission_id = ?", [missionId]);
  await execute("DELETE FROM tasks WHERE mission_id = ?", [missionId]);
  await execute("DELETE FROM livrables WHERE mission_id = ?", [missionId]);

  let totalTasks = 0;
  let totalLivr = 0;

  for (const phase of phases) {
    const phaseWeeks = weeks.filter(w => String(w.phase_id) === String(phase.id));
    if (!phaseWeeks.length) continue;

    const phaseLabel = String(phase.label);
    const weekTitles = phaseWeeks.map(w => String(w.title)).join(" ");

    // RAG : recherche documents pertinents pour cette phase
    const ragContext = await getRelevantContext(
      `${phaseLabel} ${weekTitles}`,
      { missionId, threshold: 0.65, limit: 10 },
    );

    // Règles apprises pertinentes
    const rules = await getRelevantRules(
      "tasks",
      { phase: phaseLabel },
      { missionId },
    );
    const rulesBlock = buildRulesBlock(rules);

    const content = await generatePhaseContent(
      anthropic, missionContext,
      phaseLabel, phase.start_date as string | null, phase.end_date as string | null,
      phaseWeeks, ragContext, rulesBlock, inputs,
    );

    for (const wc of content.weeks) {
      for (const t of wc.tasks) {
        await execute(
          `INSERT INTO tasks (id, week_id, label, description, owner, priority, status, source, mission_id)
           VALUES (?, ?, ?, ?, ?, ?, 'todo', 'llm', ?)`,
          [newId("task"), wc.week_id, t.label, t.description ?? "", t.owner, t.priority, missionId],
        );
        totalTasks++;
      }
      for (const l of wc.livrables) {
        const livrId = newId("livr");
        await execute(
          `INSERT INTO livrables (id, week_id, label, status, mission_id, primary_phase_id, type)
           VALUES (?, ?, ?, 'planifie', ?, ?, 'phase')`,
          [livrId, wc.week_id, l.label, missionId, iv(phase.id)],
        );
        await execute(
          `INSERT INTO deliverable_iterations (id, deliverable_id, mission_id, phase_id, order_index)
           VALUES (?, ?, ?, ?, 1)`,
          [newId("iter"), livrId, missionId, iv(phase.id)],
        );
        totalLivr++;
      }
    }
  }

  return { tasks: totalTasks, livrables: totalLivr };
}
