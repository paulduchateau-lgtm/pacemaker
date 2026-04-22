/**
 * Logique serveur de régénération du plan par phases.
 * Utilisé par l'API /api/llm/regenerate-plan et le script CLI.
 */
import { execute, query } from "@/lib/db";
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

async function generatePhaseContent(
  anthropic: Anthropic,
  missionContext: string,
  phaseLabel: string,
  phaseStart: string | null,
  phaseEnd: string | null,
  phaseWeeks: Row[],
): Promise<PhaseContent> {
  const weeksDesc = phaseWeeks
    .map(w => `  - Semaine ${w.id} «${w.title}» (${w.start_date} → ${w.end_date})`)
    .join("\n");

  const resp = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 4000,
    messages: [{
      role: "user",
      content: `Tu génères le plan de travail d'une phase d'une mission de consulting.

=== CONTEXTE MISSION ===
${missionContext}
=== FIN CONTEXTE ===

Phase : ${phaseLabel} (${phaseStart} → ${phaseEnd})
Semaines :
${weeksDesc}

CONSIGNES :
- 4 à 6 tâches opérationnelles concrètes par semaine (propriétaires : Paul, Benoît, Nathalie, Équipe).
- 1 à 3 livrables formels par semaine (rapports R1-R5, fichiers .pbix, documents Word/PPT).
- Priorités : haute | moyenne | basse.

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

  // Effacement
  await execute("DELETE FROM deliverable_iterations WHERE mission_id = ?", [missionId]);
  await execute("DELETE FROM tasks WHERE mission_id = ?", [missionId]);
  await execute("DELETE FROM livrables WHERE mission_id = ?", [missionId]);

  let totalTasks = 0;
  let totalLivr = 0;

  for (const phase of phases) {
    const phaseWeeks = weeks.filter(w => String(w.phase_id) === String(phase.id));
    if (!phaseWeeks.length) continue;

    const content = await generatePhaseContent(
      anthropic, missionContext,
      String(phase.label), phase.start_date as string | null, phase.end_date as string | null,
      phaseWeeks,
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
