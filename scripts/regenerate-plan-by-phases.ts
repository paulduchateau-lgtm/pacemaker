/**
 * Régénération du plan Agirc-Arrco par phases.
 * Étapes :
 *   1. Efface toutes les tasks + livrables + deliverable_iterations de la mission.
 *   2. Appelle Claude pour générer un plan cohérent phase par phase.
 *   3. Insère les nouvelles tâches et livrables en base.
 *
 * Usage : set -a && source .env.local && set +a && npx tsx scripts/regenerate-plan-by-phases.ts
 * AVERTISSEMENT : destructif — efface le plan existant d'Agirc-Arrco avant régénération.
 */
import { createClient } from "@libsql/client";
import Anthropic from "@anthropic-ai/sdk";

const SLUG = "agirc-arrco-2026";

interface PhaseRow {
  id: string;
  label: string;
  order_index: number;
  start_date: string | null;
  end_date: string | null;
}

interface WeekRow {
  id: number;
  title: string;
  phase_id: string;
  start_date: string | null;
  end_date: string | null;
}

interface GeneratedTask {
  label: string;
  owner: string;
  priority: "haute" | "moyenne" | "basse";
  description?: string;
}

interface GeneratedLivrable {
  label: string;
  format: string;
}

interface PhaseContent {
  phase_label: string;
  weeks: {
    week_id: number;
    week_title: string;
    tasks: GeneratedTask[];
    livrables: GeneratedLivrable[];
  }[];
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

async function generatePlanForPhase(
  anthropic: Anthropic,
  missionContext: string,
  phase: PhaseRow,
  weeks: WeekRow[],
): Promise<PhaseContent> {
  const weeksDesc = weeks
    .map(w => `  - Semaine ${w.id} «${w.title}» (${w.start_date} → ${w.end_date})`)
    .join("\n");

  const prompt = `Tu génères le plan de travail détaillé d'une phase d'une mission de consulting.

=== CONTEXTE MISSION ===
${missionContext}
=== FIN CONTEXTE ===

Phase : ${phase.label} (${phase.start_date} → ${phase.end_date})
Semaines de cette phase :
${weeksDesc}

CONSIGNES :
- Pour chaque semaine, génère 4 à 6 tâches opérationnelles concrètes (pas génériques).
- Pour chaque semaine, génère 1 à 3 livrables attendus (documents, fichiers, livrables formels).
- Propriétaires possibles : "Paul" (consultant LiteOps), "Benoît" (client DAS), "Nathalie" (client DAS), "Équipe".
- Priorités : "haute" | "moyenne" | "basse".
- Les tâches et livrables doivent être cohérents avec le contexte Power BI / DAS Agirc-Arrco.
- Sois précis : nomme les rapports (R1 Événements, R2 ECO, R3 Prévention, R4 75 ans, R5 Habitat), les indicateurs, les outils.

Réponds UNIQUEMENT avec du JSON valide, structure exacte :
{
  "phase_label": "${phase.label}",
  "weeks": [
    {
      "week_id": <int>,
      "week_title": "<titre semaine>",
      "tasks": [
        {"label": "...", "owner": "Paul|Benoît|Nathalie|Équipe", "priority": "haute|moyenne|basse", "description": "..."}
      ],
      "livrables": [
        {"label": "...", "format": "Fichier Power BI .pbix|Document Word|Présentation PPT|Tableau Excel|Email|Note interne"}
      ]
    }
  ]
}`;

  const resp = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = resp.content[0].type === "text" ? resp.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Pas de JSON dans la réponse pour phase ${phase.label}`);
  return JSON.parse(jsonMatch[0]) as PhaseContent;
}

async function main() {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!url) throw new Error("TURSO_DATABASE_URL manquant");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY manquant");

  const db = createClient({ url, authToken: authToken ?? "" });
  const anthropic = new Anthropic({ apiKey });

  // 1. Charger la mission
  const mRow = await db.execute({
    sql: "SELECT id, context, theme, label FROM missions WHERE slug = ? LIMIT 1",
    args: [SLUG],
  });
  if (!mRow.rows.length) { console.error("Mission introuvable:", SLUG); process.exit(1); }
  const missionId = String(mRow.rows[0].id);
  const missionContext = String(mRow.rows[0].context ?? "");
  console.log("Mission :", mRow.rows[0].label, "(", missionId, ")");

  // 2. Charger phases + weeks
  const pRows = await db.execute({
    sql: "SELECT id, label, order_index, start_date, end_date FROM phases WHERE mission_id=? ORDER BY order_index",
    args: [missionId],
  });
  const phases = pRows.rows as unknown as PhaseRow[];

  const wRows = await db.execute({
    sql: "SELECT id, title, phase_id, start_date, end_date FROM weeks WHERE mission_id=? ORDER BY id",
    args: [missionId],
  });
  const weeks = wRows.rows as unknown as WeekRow[];

  console.log(`\n${phases.length} phases, ${weeks.length} semaines chargées.`);

  // 3. EFFACEMENT — tasks, livrables, deliverable_iterations
  console.log("\nEffacement du plan existant...");
  const delIter = await db.execute({
    sql: "DELETE FROM deliverable_iterations WHERE mission_id = ?",
    args: [missionId],
  });
  const delTasks = await db.execute({
    sql: "DELETE FROM tasks WHERE mission_id = ?",
    args: [missionId],
  });
  const delLivr = await db.execute({
    sql: "DELETE FROM livrables WHERE mission_id = ?",
    args: [missionId],
  });
  console.log(`  iterations supprimées : ${delIter.rowsAffected}`);
  console.log(`  tâches supprimées     : ${delTasks.rowsAffected}`);
  console.log(`  livrables supprimés   : ${delLivr.rowsAffected}`);

  // 4. Génération + insertion phase par phase
  let totalTasks = 0;
  let totalLivr = 0;

  for (const phase of phases) {
    const phaseWeeks = weeks.filter(w => String(w.phase_id) === String(phase.id));
    if (!phaseWeeks.length) {
      console.log(`\nPhase ${phase.label} : aucune semaine associée, skip.`);
      continue;
    }

    console.log(`\n⟳ Génération phase ${phase.order_index} — ${phase.label} (${phaseWeeks.length} semaine(s))...`);
    const content = await generatePlanForPhase(anthropic, missionContext, phase, phaseWeeks);

    for (const weekContent of content.weeks) {
      const weekId = weekContent.week_id;

      // Insérer les tâches
      for (const t of weekContent.tasks) {
        const taskId = newId("task");
        await db.execute({
          sql: `INSERT INTO tasks (id, week_id, label, description, owner, priority, status, source, mission_id)
                VALUES (?, ?, ?, ?, ?, ?, 'todo', 'llm', ?)`,
          args: [taskId, weekId, t.label, t.description ?? "", t.owner, t.priority, missionId],
        });
        totalTasks++;
      }

      // Insérer les livrables + iteration initiale
      for (const l of weekContent.livrables) {
        const livrId = newId("livr");
        await db.execute({
          sql: `INSERT INTO livrables (id, week_id, label, status, mission_id, primary_phase_id, type)
                VALUES (?, ?, ?, 'planifie', ?, ?, 'phase')`,
          args: [livrId, weekId, l.label, missionId, phase.id],
        });

        // Créer l'iteration initiale liée à la phase
        const iterId = newId("iter");
        await db.execute({
          sql: `INSERT INTO deliverable_iterations
                (id, deliverable_id, mission_id, phase_id, order_index)
                VALUES (?, ?, ?, ?, 1)`,
          args: [iterId, livrId, missionId, phase.id],
        });
        totalLivr++;
      }

      console.log(`  S${weekId} «${weekContent.week_title}» : ${weekContent.tasks.length} tâches, ${weekContent.livrables.length} livrables`);
    }
  }

  console.log(`\n▶ Régénération terminée.`);
  console.log(`  Tâches créées   : ${totalTasks}`);
  console.log(`  Livrables créés : ${totalLivr}`);
}

main().catch(e => { console.error(e); process.exit(1); });
