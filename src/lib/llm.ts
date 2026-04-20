import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
  // Caches facultatifs (Claude SDK les expose en option)
  cacheCreationTokens?: number;
  cacheReadTokens?: number;
}

export interface LlmResult {
  text: string;
  usage: LlmUsage;
  model: string;
  stopReason: string | null;
}

const DEFAULT_MODEL = "claude-sonnet-4-20250514";

/**
 * Appelle le LLM et retourne UNIQUEMENT le texte (compat legacy).
 * La télémétrie tokens est maintenant disponible via `callLLMWithUsage`.
 */
export async function callLLM(
  prompt: string,
  maxTokens: number = 2000,
): Promise<string> {
  const res = await callLLMWithUsage(prompt, maxTokens);
  return res.text;
}

/**
 * Appelle le LLM et retourne texte + usage de tokens.
 * Utile pour les routes qui veulent logger la consommation.
 */
export async function callLLMWithUsage(
  prompt: string,
  maxTokens: number = 2000,
): Promise<LlmResult> {
  const message = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });

  const block = message.content[0];
  if (!block || block.type !== "text") {
    throw new Error("Unexpected response format from LLM");
  }

  return {
    text: block.text,
    usage: {
      inputTokens: message.usage?.input_tokens ?? 0,
      outputTokens: message.usage?.output_tokens ?? 0,
      cacheCreationTokens:
        (message.usage as unknown as { cache_creation_input_tokens?: number })
          ?.cache_creation_input_tokens ?? undefined,
      cacheReadTokens:
        (message.usage as unknown as { cache_read_input_tokens?: number })
          ?.cache_read_input_tokens ?? undefined,
    },
    model: message.model ?? DEFAULT_MODEL,
    stopReason: message.stop_reason ?? null,
  };
}

/**
 * Version avec prompt caching Anthropic (cache_control: ephemeral).
 * Le bloc `system` est marqué comme cachable : Anthropic le conserve 5 min
 * par défaut après un premier appel. Sur Sonnet-4 il faut un minimum
 * d'environ 1024 tokens dans le system pour que le cache s'active — en
 * dessous, l'appel fonctionne mais sans économie.
 *
 * Tarif : cache write +25%, cache read -90% vs prix input standard.
 * Les tokens cache_creation et cache_read apparaissent dans `usage`.
 */
export async function callLLMCached(
  system: string,
  user: string,
  maxTokens: number = 2000,
): Promise<LlmResult> {
  const message = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: maxTokens,
    system: [
      {
        type: "text",
        text: system,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: user }],
  });

  const block = message.content[0];
  if (!block || block.type !== "text") {
    throw new Error("Unexpected response format from LLM");
  }

  return {
    text: block.text,
    usage: {
      inputTokens: message.usage?.input_tokens ?? 0,
      outputTokens: message.usage?.output_tokens ?? 0,
      cacheCreationTokens:
        (message.usage as unknown as { cache_creation_input_tokens?: number })
          ?.cache_creation_input_tokens ?? undefined,
      cacheReadTokens:
        (message.usage as unknown as { cache_read_input_tokens?: number })
          ?.cache_read_input_tokens ?? undefined,
    },
    model: message.model ?? DEFAULT_MODEL,
    stopReason: message.stop_reason ?? null,
  };
}

export function parseJSON<T>(text: string): T {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = jsonMatch ? jsonMatch[1].trim() : text.trim();
  return JSON.parse(raw);
}
