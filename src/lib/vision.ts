import Anthropic from "@anthropic-ai/sdk";
import type { VisionExtraction } from "@/types";
import { getMissionContext } from "./mission-context";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const VISION_PROMPT_CORE = `Tu analyses une photo prise lors d'un atelier ou d'une réunion de la mission décrite ci-dessus.
La photo peut être : un tableau blanc, des Post-it, une slide projetée, un écran, un cahier, un schéma manuscrit.

Extrais le contenu structuré suivant :
- ocr_text : tout le texte lisible sur la photo
- summary : résumé en 1-2 phrases de ce que montre la photo
- detected_elements : liste des éléments détectés avec leur type et contenu
  Types possibles : "decision", "action", "risk", "kpi", "schema", "note"
- confidence : score de confiance 0-1 sur la qualité de l'extraction

Réponds UNIQUEMENT avec du JSON valide :
{
  "ocr_text": "...",
  "summary": "...",
  "detected_elements": [{"type": "...", "content": "..."}],
  "confidence": 0.85
}`;

export async function extractFromImage(
  imageUrl: string
): Promise<VisionExtraction> {
  const missionContext = await getMissionContext();
  const prompt = `=== CONTEXTE MISSION ===\n${missionContext}\n=== FIN CONTEXTE ===\n\n${VISION_PROMPT_CORE}`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "url", url: imageUrl },
          },
          { type: "text", text: prompt },
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
