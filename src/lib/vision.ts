import Anthropic from "@anthropic-ai/sdk";
import type { VisionExtraction } from "@/types";
import { getMissionContext } from "./mission-context";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const VISION_SYSTEM_CORE = `Tu analyses une photo prise lors d'un atelier ou d'une réunion de la mission
décrite ci-dessus. La photo peut être : un tableau blanc, des Post-it, une
slide projetée, un écran, un cahier, un schéma manuscrit.

Extrais le contenu structuré suivant :
- ocr_text : tout le texte lisible sur la photo
- summary : résumé en 1-2 phrases de ce que montre la photo
- detected_elements : liste des éléments détectés avec leur type et contenu.
  Types possibles : "decision", "action", "risk", "kpi", "schema", "note"
- confidence : score de confiance 0-1 sur la qualité de l'extraction

Réponds UNIQUEMENT avec du JSON valide :
{
  "ocr_text": "...",
  "summary": "...",
  "detected_elements": [{"type": "...", "content": "..."}],
  "confidence": 0.85
}`;

/**
 * Extrait le contenu structuré d'une image via Claude Vision.
 * Chantier 6 : `missionId` explicite pour scoper le contexte mission (avant
 * ça retombait systématiquement sur DEFAULT_MISSION_SLUG). Prompt système
 * cachable côté Anthropic (cache_control ephemeral).
 */
export async function extractFromImage(
  imageUrl: string,
  opts: { missionId?: string } = {},
): Promise<VisionExtraction> {
  const missionContext = await getMissionContext(
    opts.missionId ? { missionId: opts.missionId } : undefined,
  );
  const missionBlock = missionContext.trim()
    ? `=== CONTEXTE MISSION ===\n${missionContext.trim()}\n=== FIN CONTEXTE ===\n\n`
    : "";
  const system = `${missionBlock}${VISION_SYSTEM_CORE}`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: [
      { type: "text", text: system, cache_control: { type: "ephemeral" } },
    ],
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "url", url: imageUrl } },
          { type: "text", text: "Analyse cette photo selon le schéma JSON défini." },
        ],
      },
    ],
  });

  const block = message.content[0];
  if (block.type !== "text") throw new Error("Unexpected response");

  const jsonMatch = block.text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = jsonMatch ? jsonMatch[1].trim() : block.text.trim();
  return JSON.parse(raw);
}
