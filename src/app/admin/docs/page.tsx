"use client";

import { useEffect, useState, useRef } from "react";
import { useStore } from "@/store";
import type { Document } from "@/types";
import DocCard from "@/components/docs/DocCard";
import DocSearch from "@/components/docs/DocSearch";
import DocModal from "@/components/docs/DocModal";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

const ACCEPTED =
  ".pdf,.docx,.pptx,.xlsx,.xls,.jpg,.jpeg,.png,.webp,.heic";

export default function DocsPage() {
  const { documents, fetchDocs } = useStore();
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<Document | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDocs().then(() => setLoaded(true));
  }, [fetchDocs]);

  // Text-only document upload
  const handleTextUpload = async () => {
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
    } catch {
      setUploadStatus("Erreur réseau");
    }
    setUploading(false);
  };

  // File upload (PDF, DOCX, PPTX, XLSX, images)
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadStatus("");

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadStatus(
        `Upload ${i + 1}/${files.length} : ${file.name}...`
      );

      const formData = new FormData();
      formData.append("file", file);
      if (title.trim()) formData.append("title", title.trim());

      try {
        const res = await fetch("/api/docs/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (data.error) {
          setUploadStatus(`Erreur : ${data.error}`);
        }
      } catch {
        setUploadStatus(`Erreur réseau pour ${file.name}`);
      }
    }

    await fetchDocs();
    setUploadStatus("Upload terminé");
    setTitle("");
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    setTimeout(() => setUploadStatus(""), 3000);
  };

  if (!loaded) {
    return (
      <p
        className="text-sm py-8 text-center"
        style={{ color: "var(--color-muted)" }}
      >
        Chargement...
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1
          className="text-lg font-medium"
          style={{ color: "var(--color-ink)" }}
        >
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
          className="p-4 border space-y-4"
          style={{
            borderColor: "var(--color-border)",
            borderRadius: "6px",
          }}
        >
          {/* File upload zone */}
          <div>
            <label
              className="mono-label block mb-2"
              style={{ color: "var(--color-muted)" }}
            >
              IMPORTER UN FICHIER
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              <Badge label="PDF" />
              <Badge label="DOCX" />
              <Badge label="PPTX" />
              <Badge label="XLSX" />
              <Badge label="IMAGE" />
            </div>
            <div
              className="border-2 border-dashed p-6 text-center cursor-pointer min-h-[44px]"
              style={{
                borderColor: "var(--color-border)",
                borderRadius: "6px",
              }}
              onClick={() => fileRef.current?.click()}
            >
              <p
                className="text-sm"
                style={{ color: "var(--color-muted)" }}
              >
                Cliquez ou glissez un fichier ici
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: "var(--color-muted)" }}
              >
                Max 20 Mo — le texte sera extrait automatiquement pour le RAG
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept={ACCEPTED}
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {/* Optional title override */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre (optionnel — le nom du fichier sera utilisé par défaut)"
            className="w-full text-sm bg-transparent border px-3 py-2 min-h-[44px] outline-none"
            style={{
              borderColor: "var(--color-border)",
              borderRadius: "6px",
            }}
          />

          {/* Separator */}
          <div className="flex items-center gap-3">
            <div
              className="flex-1 border-t"
              style={{ borderColor: "var(--color-border)" }}
            />
            <span
              className="mono-label"
              style={{ color: "var(--color-muted)" }}
            >
              OU TEXTE LIBRE
            </span>
            <div
              className="flex-1 border-t"
              style={{ borderColor: "var(--color-border)" }}
            />
          </div>

          {/* Text upload */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Collez un compte-rendu, une note, une spécification..."
            className="w-full text-sm bg-transparent border p-3 outline-none resize-y min-h-[100px]"
            style={{
              borderColor: "var(--color-border)",
              borderRadius: "6px",
            }}
          />
          <Button
            onClick={handleTextUpload}
            disabled={uploading || !title.trim() || !content.trim()}
          >
            {uploading ? "INDEXATION..." : "AJOUTER TEXTE ET INDEXER"}
          </Button>

          {uploadStatus && (
            <p
              className="text-sm"
              style={{
                color: uploadStatus.includes("Erreur")
                  ? "var(--color-alert)"
                  : "var(--color-green)",
              }}
            >
              {uploadStatus}
            </p>
          )}
        </div>
      )}

      <p
        className="mono-label"
        style={{ color: "var(--color-muted)" }}
      >
        {documents.length} DOCUMENTS
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {documents.map((doc) => (
          <DocCard
            key={doc.id}
            doc={doc}
            onClick={() => setSelected(doc)}
          />
        ))}
      </div>

      {documents.length === 0 && (
        <p
          className="text-sm text-center py-8"
          style={{ color: "var(--color-muted)" }}
        >
          Aucun document. Importez un fichier ou prenez une photo.
        </p>
      )}

      {selected && (
        <DocModal doc={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
