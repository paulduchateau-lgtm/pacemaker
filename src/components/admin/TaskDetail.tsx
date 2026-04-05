"use client";

import { useState, useRef } from "react";
import type { Task } from "@/types";
import { useStore } from "@/store";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

interface LivrableGenere {
  titre: string;
  description: string;
  format: string;
}

interface LivrablesData {
  livrables: LivrableGenere[];
  plan_action: string;
}

export default function TaskDetail({ task }: { task: Task }) {
  const updateTaskDescription = useStore((s) => s.updateTaskDescription);
  const updateTaskLivrables = useStore((s) => s.updateTaskLivrables);
  const addTaskAttachment = useStore((s) => s.addTaskAttachment);
  const deleteTaskAttachment = useStore((s) => s.deleteTaskAttachment);

  const [desc, setDesc] = useState(task.description || "");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const dirty = desc !== (task.description || "");
  const livrables: LivrablesData | null = task.livrables_generes
    ? JSON.parse(task.livrables_generes)
    : null;

  const handleSaveDesc = async () => {
    setSaving(true);
    await updateTaskDescription(task.id, desc);
    setSaving(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/llm/generate-livrables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id }),
      });
      if (res.ok) {
        const data = await res.json();
        updateTaskLivrables(task.id, JSON.stringify(data));
      }
    } catch {
      // silent
    }
    setGenerating(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    for (let i = 0; i < files.length; i++) {
      await addTaskAttachment(task.id, files[i]);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div
      className="px-4 md:px-8 pb-4 pt-2 space-y-4"
      style={{ backgroundColor: "var(--color-warm, #F6F4F0)" }}
    >
      {/* Description */}
      <div>
        <label className="mono-label block mb-1" style={{ color: "var(--color-muted)" }}>
          DESCRIPTION
        </label>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={3}
          className="w-full text-sm bg-white border px-3 py-2 outline-none resize-y"
          style={{
            borderColor: "var(--color-border)",
            borderRadius: "4px",
            color: "var(--color-ink)",
          }}
          placeholder={"D\u00e9crivez les objectifs, le p\u00e9rim\u00e8tre, les attendus..."}
        />
        {dirty && (
          <div className="flex justify-end mt-1">
            <Button onClick={handleSaveDesc} disabled={saving}>
              {saving ? "\u29F3" : "\u2713 SAUVEGARDER"}
            </Button>
          </div>
        )}
      </div>

      {/* Livrables IA */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className="mono-label" style={{ color: "var(--color-muted)" }}>
            LIVRABLES ATTENDUS
          </span>
          <Button
            variant="secondary"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating
              ? "\u29F3 GENERATION..."
              : livrables
                ? "\u27F3 REGENERER"
                : "\u25B6 GENERER PAR IA"}
          </Button>
        </div>

        {livrables && (
          <div className="space-y-2">
            {livrables.livrables.map((l, i) => (
              <div
                key={i}
                className="bg-white border px-3 py-2 flex items-start gap-3"
                style={{
                  borderColor: "var(--color-border)",
                  borderRadius: "4px",
                }}
              >
                <span
                  className="text-sm mt-0.5 flex-shrink-0"
                  style={{ color: "var(--color-green)" }}
                >
                  &#x25C6;
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
                    {l.titre}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>
                    {l.description}
                  </p>
                </div>
                <Badge label={l.format} color="var(--color-copper)" />
              </div>
            ))}

            {livrables.plan_action && (
              <div
                className="bg-white border px-3 py-2 mt-2"
                style={{
                  borderColor: "var(--color-border)",
                  borderRadius: "4px",
                }}
              >
                <p className="mono-label mb-1" style={{ color: "var(--color-muted)" }}>
                  PLAN D{"'"}ACTION
                </p>
                <p className="text-sm whitespace-pre-line" style={{ color: "var(--color-ink)" }}>
                  {livrables.plan_action}
                </p>
              </div>
            )}
          </div>
        )}

        {!livrables && !generating && (
          <p className="text-xs italic" style={{ color: "var(--color-muted)" }}>
            {"Cliquez sur \u00ab G\u00e9n\u00e9rer par IA \u00bb pour obtenir des livrables et un plan d'action."}
          </p>
        )}
      </div>

      {/* Pi\u00e8ces jointes */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className="mono-label" style={{ color: "var(--color-muted)" }}>
            {"PI\u00c8CES JOINTES"}
          </span>
          <label className="cursor-pointer">
            <Button
              variant="secondary"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "\u29F3 UPLOAD..." : "+ AJOUTER"}
            </Button>
          </label>
          <input
            ref={fileRef}
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            accept="*/*"
          />
        </div>

        {task.attachments && task.attachments.length > 0 ? (
          <div className="space-y-1">
            {task.attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-2 bg-white border px-3 py-2"
                style={{
                  borderColor: "var(--color-border)",
                  borderRadius: "4px",
                }}
              >
                <span className="text-sm" style={{ color: "var(--color-ink)" }}>
                  {att.contentType?.startsWith("image/") ? "\u25A3" : "\u25A1"}
                </span>
                <a
                  href={att.blobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm flex-1 min-w-0 underline"
                  style={{ color: "var(--color-ink)" }}
                >
                  {att.filename}
                </a>
                <span className="mono-label" style={{ color: "var(--color-muted)" }}>
                  {att.contentType?.split("/")[1]?.toUpperCase() || "FICHIER"}
                </span>
                <button
                  onClick={() => deleteTaskAttachment(att.id, task.id)}
                  className="text-xs px-2 py-1 opacity-40 hover:opacity-100 transition-opacity min-w-[32px] min-h-[32px] flex items-center justify-center"
                  style={{ color: "var(--color-alert)" }}
                  title="Supprimer"
                >
                  &#x2715;
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs italic" style={{ color: "var(--color-muted)" }}>
            Aucune pi\u00e8ce jointe
          </p>
        )}
      </div>

      {/* M\u00e9tadonn\u00e9es */}
      <div className="flex flex-wrap gap-2 pt-2 border-t" style={{ borderColor: "var(--color-border)" }}>
        <Badge label={`SOURCE: ${task.source}`} color="var(--color-muted)" />
        <Badge label={`CR\u00c9\u00c9: ${task.createdAt?.split("T")[0] || ""}`} color="var(--color-muted)" />
        {task.jh_estime && (
          <Badge label={`${task.jh_estime} JH`} color="var(--color-amber)" />
        )}
      </div>
    </div>
  );
}
