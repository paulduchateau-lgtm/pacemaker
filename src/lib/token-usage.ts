import { execute, query } from "./db";
import type { LlmUsage } from "./llm";

export interface LogTokensInput {
  missionId: string | null;
  generationId?: string | null;
  route: string;
  model: string;
  usage: LlmUsage;
  triggeredBy?: "user" | "auto";
}

export async function logTokenUsage(input: LogTokensInput): Promise<void> {
  const id = `tok-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  try {
    await execute(
      `INSERT INTO token_usage
         (id, mission_id, generation_id, route, model,
          input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens,
          triggered_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.missionId ?? null,
        input.generationId ?? null,
        input.route,
        input.model,
        input.usage.inputTokens,
        input.usage.outputTokens,
        input.usage.cacheCreationTokens ?? null,
        input.usage.cacheReadTokens ?? null,
        input.triggeredBy ?? "user",
      ],
    );
  } catch {
    // Jamais bloquer le flux applicatif sur un échec de logging.
  }
}

export interface DailyTokenTotal {
  day: string;
  inputTokens: number;
  outputTokens: number;
  totalCalls: number;
}

export async function getDailyTotals(
  missionId: string,
  days: number = 30,
): Promise<DailyTokenTotal[]> {
  const rows = await query(
    `SELECT substr(created_at, 1, 10) AS day,
            SUM(input_tokens) AS in_tokens,
            SUM(output_tokens) AS out_tokens,
            COUNT(*) AS n
     FROM token_usage
     WHERE mission_id = ? AND created_at >= datetime('now', ?)
     GROUP BY day
     ORDER BY day DESC`,
    [missionId, `-${days} days`],
  );
  return rows.map((r) => ({
    day: String(r.day),
    inputTokens: Number(r.in_tokens ?? 0),
    outputTokens: Number(r.out_tokens ?? 0),
    totalCalls: Number(r.n ?? 0),
  }));
}
