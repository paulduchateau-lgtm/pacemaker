"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useStore } from "@/store";

export default function RulesCounter() {
  const { rulesStats, fetchRulesStats } = useStore();

  useEffect(() => {
    fetchRulesStats();
  }, [fetchRulesStats]);

  if (rulesStats.total === 0) return null;

  return (
    <Link
      href="/admin/regles"
      className="font-mono uppercase tracking-wider transition-colors"
      style={{
        fontSize: "10px",
        letterSpacing: "0.12em",
        color: "var(--color-paper)",
        opacity: 0.6,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-green)")}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "var(--color-paper)";
        e.currentTarget.style.opacity = "0.6";
      }}
    >
      {rulesStats.total} règle{rulesStats.total > 1 ? "s" : ""} · {rulesStats.applications} appl.
    </Link>
  );
}
