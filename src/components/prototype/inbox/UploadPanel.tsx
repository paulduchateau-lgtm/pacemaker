"use client";

import { useRef, useState } from "react";

const ACCEPTED = ".pdf,.docx,.pptx,.xlsx,.xls,.jpg,.jpeg,.png,.webp,.heic";

export default function UploadPanel({ slug }: { slug: string }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setStatus("");
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setStatus(`Upload ${i + 1}/${files.length} : ${file.name}…`);
      const fd = new FormData();
      fd.append("file", file);
      if (title.trim()) fd.append("title", title.trim());
      try {
        const res = await fetch("/api/docs/upload", {
          method: "POST",
          headers: { "x-mission-slug": slug },
          body: fd,
        });
        const data = await res.json();
        if (data.error) setStatus(`Erreur : ${data.error}`);
      } catch {
        setStatus(`Erreur réseau pour ${file.name}`);
      }
    }
    setStatus("Upload terminé");
    setTitle("");
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    setTimeout(() => setStatus(""), 3000);
  }

  async function handleText() {
    if (!title.trim() || !content.trim()) return;
    setUploading(true);
    try {
      await fetch("/api/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-mission-slug": slug },
        body: JSON.stringify({ title: title.trim(), type: "note", source: "upload", content: content.trim() }),
      });
      setStatus("Texte indexé");
      setTitle("");
      setContent("");
    } catch {
      setStatus("Erreur réseau");
    }
    setUploading(false);
    setTimeout(() => setStatus(""), 3000);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ fontSize: 13.5, color: "var(--muted)" }}>
        Importe PDF, DOCX, PPTX, XLSX, images — le texte sera extrait et indexé pour le RAG.
        Ou colle un texte libre (CR, note, spécification).
      </p>

      <div
        style={{
          border: "2px dashed var(--border)",
          borderRadius: 8,
          padding: 28,
          textAlign: "center",
          cursor: "pointer",
          background: "var(--paper-elevated)",
        }}
        onClick={() => fileRef.current?.click()}
      >
        <div style={{ fontSize: 14, marginBottom: 4 }}>Cliquer ou glisser un fichier ici</div>
        <div className="mono" style={{ color: "var(--muted)" }}>
          PDF · DOCX · PPTX · XLSX · IMAGE — max 20 Mo
        </div>
        <input ref={fileRef} type="file" multiple accept={ACCEPTED} onChange={handleFile} style={{ display: "none" }} />
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titre (optionnel — le nom de fichier sera utilisé par défaut)"
        style={{
          width: "100%", padding: "8px 12px",
          border: "1px solid var(--border)", borderRadius: 6,
          fontSize: 13.5, background: "var(--paper-elevated)",
        }}
      />

      <div className="row" style={{ gap: 10, alignItems: "center" }}>
        <div style={{ flex: 1, height: 1, background: "var(--border-soft)" }} />
        <span className="mono" style={{ color: "var(--muted)" }}>OU TEXTE LIBRE</span>
        <div style={{ flex: 1, height: 1, background: "var(--border-soft)" }} />
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Colle un compte-rendu, une note, une spécification…"
        rows={6}
        style={{
          width: "100%", padding: 12,
          border: "1px solid var(--border)", borderRadius: 6,
          fontSize: 13.5, background: "var(--paper-elevated)",
          resize: "vertical",
        }}
      />

      <button
        onClick={handleText}
        disabled={uploading || !title.trim() || !content.trim()}
        className="btn btn-primary"
        style={{ alignSelf: "flex-start", opacity: uploading || !title.trim() || !content.trim() ? 0.5 : 1 }}
      >
        {uploading ? "Indexation…" : "Ajouter texte et indexer"}
      </button>

      {status && (
        <p className="mono" style={{ color: status.includes("Erreur") ? "var(--alert)" : "var(--green-deep)" }}>
          {status}
        </p>
      )}
    </div>
  );
}
