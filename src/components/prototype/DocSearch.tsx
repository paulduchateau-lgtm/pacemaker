"use client";

import { useState, useCallback, useRef } from "react";
import type { RagSearchResult } from "@/types";
import Icon from "./Icon";

export default function DocSearch({ slug }: { slug: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RagSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearch = useCallback(
    (q: string) => {
      setQuery(q);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (q.trim().length < 3) {
        setResults([]);
        return;
      }
      timerRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          const res = await fetch(`/api/docs/search?q=${encodeURIComponent(q.trim())}`, {
            headers: { "x-mission-slug": slug },
          });
          const data = await res.json();
          setResults(Array.isArray(data) ? data : []);
        } catch {
          setResults([]);
        }
        setLoading(false);
      }, 500);
    },
    [slug],
  );

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 10, top: 9, color: "var(--muted)" }}>
          <Icon name="search" />
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Recherche sémantique dans les sources (3 caractères min)…"
          style={{
            width: "100%",
            padding: "8px 12px 8px 32px",
            border: "1px solid var(--border)",
            borderRadius: 6,
            fontSize: 13.5,
            background: "var(--paper-elevated)",
            color: "var(--ink)",
          }}
        />
      </div>
      {loading && (
        <p className="mono" style={{ color: "var(--muted)", marginTop: 8 }}>
          RECHERCHE…
        </p>
      )}
      {results.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
          {results.map((r) => (
            <div key={r.chunkId} className="card" style={{ padding: 12 }}>
              <div className="row" style={{ gap: 8, marginBottom: 4 }}>
                <span className="mono" style={{ color: "var(--green-deep)", fontWeight: 500 }}>
                  {Math.round((1 - r.distance) * 100)}%
                </span>
                <span className="mono" style={{ color: "var(--muted)" }}>
                  {r.docTitle}
                </span>
              </div>
              <p style={{ fontSize: 13, color: "var(--ink)" }}>{r.content}</p>
            </div>
          ))}
        </div>
      )}
      {query.trim().length >= 3 && !loading && results.length === 0 && (
        <p className="mono" style={{ color: "var(--muted)", marginTop: 8 }}>
          Aucun résultat pour « {query} ».
        </p>
      )}
    </div>
  );
}
