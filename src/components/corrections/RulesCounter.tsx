"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useStore } from "@/store";
import { DEFAULT_MISSION_SLUG } from "@/lib/mission-constants";

type Props = { missionSlug?: string };

export default function RulesCounter({ missionSlug }: Props) {
  const { rulesStats, fetchRulesStats } = useStore();
  const slug = missionSlug ?? DEFAULT_MISSION_SLUG;

  useEffect(() => {
    fetchRulesStats();
  }, [fetchRulesStats]);

  if (rulesStats.total === 0) return null;

  return (
    <Link
      href={`/admin/missions/${slug}/regles`}
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
