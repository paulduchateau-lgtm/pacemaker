import { NextResponse } from "next/server";
import { execute, query } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Migration chantier 06 — confiance et argumentation visibles.
 * Idempotente. Ajoute `confidence` (REAL 0..1) et `reasoning` (TEXT)
 * sur tasks, risks, livrables pour exposer l'incertitude LLM.
 *
 * decisions.confidence et decisions.rationale existent déjà (chantier 02).
 */

async function hasColumn(table: string, column: string): Promise<boolean> {
  const rows = await query(`PRAGMA table_info(${table})`);
  return rows.some((r) => (r as unknown as { name: string }).name === column);
}

const TARGETS: Array<[string, string, string]> = [
  // table, column, declaration
  ["tasks", "confidence", "REAL"],
  ["tasks", "reasoning", "TEXT"],
  ["risks", "confidence", "REAL"],
  ["risks", "reasoning", "TEXT"],
  ["livrables", "confidence", "REAL"],
  ["livrables", "reasoning", "TEXT"],
];

export async function POST() {
  const log: string[] = [];
  try {
    for (const [table, column, decl] of TARGETS) {
      if (await hasColumn(table, column)) {
        log.push(`skip: ${table}.${column} already present`);
        continue;
      }
      await execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${decl}`);
      log.push(`OK: ${table}.${column} added (${decl})`);
    }
    return NextResponse.json({ ok: true, log });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json(
      { ok: false, error: message, log },
      { status: 500 },
    );
  }
}
