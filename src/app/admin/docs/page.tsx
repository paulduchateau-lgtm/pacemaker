"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store";
import type { Document } from "@/types";
import DocCard from "@/components/docs/DocCard";
import DocSearch from "@/components/docs/DocSearch";
import DocModal from "@/components/docs/DocModal";
import Button from "@/components/ui/Button";

export default function DocsPage() {
  const { documents, fetchDocs } = useStore();
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<Document | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchDocs().then(() => setLoaded(true));
  }, [fetchDocs]);

  const handleUpload = async () => {
    if (!title.trim() || !content.trim()) return;
    setUploading(true);
    try {
      await fetch("/api/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          type: "note",
          source: "upload",
          content: content.trim(),
        }),
      });
      await fetchDocs();
      setTitle("");
      setContent("");
      setShowUpload(false);
    } catch {}
    setUploading(false);
  };

  if (!loaded) {
    return (
      <p className="text-sm py-8 text-center" style={{ color: "var(--color-muted)" }}>
        Chargement...
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium" style={{ color: "var(--color-ink)" }}>
          Base documentaire
        </h1>
        <Button
          variant="secondary"
          onClick={() => setShowUpload(!showUpload)}
        >
          {showUpload ? "ANNULER" : "+ AJOUTER"}
        </Button>
      </div>

      <DocSearch />

      {showUpload && (
        <div
          className="p-4 border space-y-3"
          style={{ borderColor: "var(--color-border)", borderRadius: "6px" }}
        >
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre du document"
            className="w-full text-sm bg-transparent border px-3 py-2 min-h-[44px] outline-none"
            style={{ borderColor: "var(--color-border)", borderRadius: "6px" }}
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Contenu du document..."
            className="w-full text-sm bg-transparent border p-3 outline-none resize-y min-h-[120px]"
            style={{ borderColor: "var(--color-border)", borderRadius: "6px" }}
          />
          <Button onClick={handleUpload} disabled={uploading || !title.trim()}>
            {uploading ? "INDEXATION..." : "AJOUTER ET INDEXER"}
          </Button>
        </div>
      )}

      <p className="mono-label" style={{ color: "var(--color-muted)" }}>
        {documents.length} DOCUMENTS
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {documents.map((doc) => (
          <DocCard key={doc.id} doc={doc} onClick={() => setSelected(doc)} />
        ))}
      </div>

      {documents.length === 0 && (
        <p className="text-sm text-center py-8" style={{ color: "var(--color-muted)" }}>
          Aucun document. Ajoutez un CR ou prenez une photo.
        </p>
      )}

      {selected && (
        <DocModal doc={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
