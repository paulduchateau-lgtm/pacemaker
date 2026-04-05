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
  const updateTaskCompletedAt = useStore((s) => s.updateTaskCompletedAt);
  const addManualLivrable = useStore((s) => s.addManualLivrable);
  const removeManualLivrable = useStore((s) => s.removeManualLivrable);
  const addTaskAttachment = useStore((s) => s.addTaskAttachment);
  const deleteTaskAttachment = useStore((s) => s.deleteTaskAttachment);
  const fetchDocs = useStore((s) => s.fetchDocs);

  const [desc, setDesc] = useState(task.description || "");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [creatingIdx, setCreatingIdx] = useState<number | null>(null);
  const [addingLivrable, setAddingLivrable] = useState(false);
  const [newTitre, setNewTitre] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newFormat, setNewFormat] = useState("docx");
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

  const handleCreateLivrable = async (
    livrable: LivrableGenere,
    index: number
  ) => {
    setCreatingIdx(index);
    try {
      const res = await fetch("/api/llm/create-livrable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          livrable,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        window.open(data.url, "_blank");
        // Refresh docs list so the generated livrable appears
        fetchDocs();
      }
    } catch {
      // silent
    }
    setCreatingIdx(null);
  };

  const handleAddManualLivrable = () => {
    if (!newTitre.trim()) return;
    addManualLivrable(task.id, newTitre, newDesc, newFormat);
    setNewTitre("");
    setNewDesc("");
    setNewFormat("docx");
    setAddingLivrable(false);
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
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
      {/* Completion date */}
      {task.status === "fait" && (
        <div className="flex items-center gap-3">
          <span
            className="mono-label"
            style={{ color: "var(--color-green)" }}
          >
            ◆ RÉALISÉ LE
          </span>
          <input
            type="date"
            value={task.completedAt || ""}
            onChange={(e) => updateTaskCompletedAt(task.id, e.target.value || null)}
            className="text-sm bg-white border px-2 py-1 min-h-[36px]"
            style={{
              borderColor: "var(--color-border)",
              borderRadius: "4px",
              color: "var(--color-ink)",
            }}
          />
        </div>
      )}

      {/* Description */}
      <div>
        <label
          className="mono-label block mb-1"
          style={{ color: "var(--color-muted)" }}
        >
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
          placeholder="Décrivez les objectifs, le périmètre, les attendus..."
        />
        {dirty && (
          <div className="flex justify-end mt-1">
            <Button onClick={handleSaveDesc} disabled={saving}>
              {saving ? "⧳" : "✓ SAUVEGARDER"}
            </Button>
          </div>
        )}
      </div>

      {/* Livrables attendus */}
      <div>
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <span
            className="mono-label"
            style={{ color: "var(--color-muted)" }}
          >
            LIVRABLES ATTENDUS
          </span>
          <Button
            variant="secondary"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating
              ? "⧳ GÉNÉRATION..."
              : livrables
                ? "⟳ RÉGÉNÉRER"
                : "▶ GÉNÉRER PAR IA"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => setAddingLivrable(!addingLivrable)}
          >
            + AJOUTER
          </Button>
        </div>

        {/* Add manual livrable form */}
        {addingLivrable && (
          <div
            className="bg-white border px-3 py-3 mb-2 space-y-2"
            style={{
              borderColor: "var(--color-green)",
              borderRadius: "4px",
            }}
          >
            <input
              type="text"
              value={newTitre}
              onChange={(e) => setNewTitre(e.target.value)}
              placeholder="Titre du livrable"
              className="w-full text-sm border px-2 py-1 min-h-[36px]"
              style={{
                borderColor: "var(--color-border)",
                borderRadius: "4px",
                color: "var(--color-ink)",
              }}
            />
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description (optionnel)"
              className="w-full text-sm border px-2 py-1 min-h-[36px]"
              style={{
                borderColor: "var(--color-border)",
                borderRadius: "4px",
                color: "var(--color-ink)",
              }}
            />
            <div className="flex items-center gap-2">
              <select
                value={newFormat}
                onChange={(e) => setNewFormat(e.target.value)}
                className="mono-label text-xs border px-2 py-1 min-h-[36px]"
                style={{
                  borderColor: "var(--color-border)",
                  borderRadius: "4px",
                  color: "var(--color-ink)",
                }}
              >
                <option value="docx">DOCX</option>
                <option value="xlsx">XLSX</option>
                <option value="pptx">PPTX</option>
                <option value="pdf">PDF</option>
                <option value="autre">AUTRE</option>
              </select>
              <Button onClick={handleAddManualLivrable} disabled={!newTitre.trim()}>
                VALIDER
              </Button>
              <Button variant="secondary" onClick={() => setAddingLivrable(false)}>
                ANNULER
              </Button>
            </div>
          </div>
        )}

        {livrables && (
          <div className="space-y-2">
            {livrables.livrables.map((l, i) => (
              <div
                key={i}
                className="bg-white border px-3 py-2"
                style={{
                  borderColor: "var(--color-border)",
                  borderRadius: "4px",
                }}
              >
                <div className="flex items-start gap-3">
                  <span
                    className="text-sm mt-0.5 flex-shrink-0"
                    style={{ color: "var(--color-green)" }}
                  >
                    ◆
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium"
                      style={{ color: "var(--color-ink)" }}
                    >
                      {l.titre}
                    </p>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: "var(--color-muted)" }}
                    >
                      {l.description}
                    </p>
                  </div>
                  <Badge label={l.format} color="var(--color-copper)" />
                  <button
                    onClick={() => removeManualLivrable(task.id, i)}
                    className="text-xs px-2 py-1 opacity-40 hover:opacity-100 transition-opacity min-w-[32px] min-h-[32px] flex items-center justify-center"
                    style={{ color: "var(--color-alert)" }}
                    title="Supprimer"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex justify-end mt-2 pt-2 border-t" style={{ borderColor: "var(--color-border)" }}>
                  <Button
                    variant="secondary"
                    onClick={() => handleCreateLivrable(l, i)}
                    disabled={creatingIdx === i}
                  >
                    {creatingIdx === i
                      ? "⧳ CRÉATION EN COURS..."
                      : "▶ CRÉER LE LIVRABLE"}
                  </Button>
                </div>
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
                <p
                  className="mono-label mb-1"
                  style={{ color: "var(--color-muted)" }}
                >
                  {"PLAN D'ACTION"}
                </p>
                <p
                  className="text-sm whitespace-pre-line"
                  style={{ color: "var(--color-ink)" }}
                >
                  {livrables.plan_action}
                </p>
              </div>
            )}
          </div>
        )}

        {!livrables && !generating && (
          <p
            className="text-xs italic"
            style={{ color: "var(--color-muted)" }}
          >
            {"Cliquez sur « Générer par IA » ou « Ajouter » pour définir les livrables attendus."}
          </p>
        )}
      </div>

      {/* Pièces jointes */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span
            className="mono-label"
            style={{ color: "var(--color-muted)" }}
          >
            PIÈCES JOINTES
          </span>
          <Button
            variant="secondary"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "⧳ UPLOAD..." : "+ AJOUTER"}
          </Button>
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
                <span
                  className="text-sm"
                  style={{ color: "var(--color-ink)" }}
                >
                  {att.contentType?.startsWith("image/") ? "▣" : "□"}
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
                <span
                  className="mono-label"
                  style={{ color: "var(--color-muted)" }}
                >
                  {att.contentType?.split("/")[1]?.toUpperCase() || "FICHIER"}
                </span>
                <button
                  onClick={() =>
                    deleteTaskAttachment(att.id, task.id)
                  }
                  className="text-xs px-2 py-1 opacity-40 hover:opacity-100 transition-opacity min-w-[32px] min-h-[32px] flex items-center justify-center"
                  style={{ color: "var(--color-alert)" }}
                  title="Supprimer"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p
            className="text-xs italic"
            style={{ color: "var(--color-muted)" }}
          >
            Aucune pièce jointe
          </p>
        )}
      </div>

      {/* Métadonnées */}
      <div
        className="flex flex-wrap gap-2 pt-2 border-t"
        style={{ borderColor: "var(--color-border)" }}
      >
        <Badge
          label={`SOURCE: ${task.source}`}
          color="var(--color-muted)"
        />
        <Badge
          label={`CRÉÉ: ${task.createdAt?.split("T")[0] || ""}`}
          color="var(--color-muted)"
        />
        {task.completedAt && (
          <Badge
            label={`FAIT: ${task.completedAt}`}
            color="var(--color-green)"
          />
        )}
        {task.jh_estime && (
          <Badge
            label={`${task.jh_estime} JH`}
            color="var(--color-amber)"
          />
        )}
      </div>
    </div>
  );
}
