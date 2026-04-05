"use client";

import { useState, useCallback } from "react";
import type { RagSearchResult } from "@/types";
import Card from "@/components/ui/Card";

export default function DocSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RagSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

  const handleSearch = useCallback(
    (q: string) => {
      setQuery(q);
      if (timer) clearTimeout(timer);
      if (q.trim().length < 3) {
        setResults([]);
        return;
      }
      const t = setTimeout(async () => {
        setLoading(true);
        try {
          const res = await fetch(
            `/api/docs/search?q=${encodeURIComponent(q.trim())}`
          );
          const data = await res.json();
          setResults(data);
        } catch {}
        setLoading(false);
      }, 500);
      setTimer(t);
    },
    [timer]
  );

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Recherche s\u00e9mantique dans la base documentaire..."
        className="w-full text-sm bg-transparent border px-3 py-2 min-h-[44px] outline-none"
        style={{
          borderColor: "var(--color-border)",
          borderRadius: "6px",
          color: "var(--color-ink)",
        }}
      />
      {loading && (
        <p className="mono-label" style={{ color: "var(--color-muted)" }}>
          RECHERCHE...
        </p>
      )}
      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((r) => (
            <Card key={r.chunkId}>
              <div className="flex items-center gap-2 mb-1">
                <span className="mono-label" style={{ color: "var(--color-green)" }}>
                  {Math.round((1 - r.distance) * 100)}%
                </span>
                <span className="mono-label" style={{ color: "var(--color-muted)" }}>
                  {r.docTitle}
                </span>
              </div>
              <p className="text-sm" style={{ color: "var(--color-ink)" }}>
                {r.content}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
