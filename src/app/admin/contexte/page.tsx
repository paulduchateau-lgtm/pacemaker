"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";

export default function ContextePage() {
  const [value, setValue] = useState("");
  const [defaultValue, setDefaultValue] = useState("");
  const [initial, setInitial] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    fetch("/api/data/project/context")
      .then((r) => r.json())
      .then((data) => {
        setValue(data.value || "");
        setInitial(data.value || "");
        setDefaultValue(data.default || "");
        setLoading(false);
      });
  }, []);

  const dirty = value !== initial;

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/data/project/context", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      setInitial(value);
      setToast("Contexte enregistré — il sera injecté dans tous les prompts LLM");
      setTimeout(() => setToast(""), 3000);
    } catch {
      setToast("Erreur à la sauvegarde");
    }
    setSaving(false);
  }

  function resetDefault() {
    setValue(defaultValue);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">
      <div className="mb-6">
        <h1
          className="font-mono uppercase tracking-wider"
          style={{
            fontSize: "12px",
            letterSpacing: "0.12em",
            color: "var(--color-ink)",
          }}
        >
          Contexte mission
        </h1>
        <p
          className="mt-2 text-sm"
          style={{ color: "var(--color-muted)" }}
        >
          Ce texte est injecté en tête de chaque prompt LLM (génération de tâches, de livrables, parsing de CR, recalibration, création de document). Modifie-le pour adapter le ton, les chiffres, le périmètre, les contacts... Toutes les générations suivantes s&apos;adapteront automatiquement.
        </p>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          Chargement...
        </p>
      ) : (
        <>
          <label
            className="mono-label block mb-2"
            style={{ color: "var(--color-muted)" }}
          >
            TEXTE INJECTÉ DANS LES PROMPTS
          </label>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={14}
            className="w-full text-sm bg-white border px-3 py-2 font-sans outline-none resize-y"
            style={{
              borderColor: "var(--color-border)",
              borderRadius: "6px",
              color: "var(--color-ink)",
              lineHeight: 1.5,
            }}
            placeholder="Décris la mission, le client, les chiffres clés, les contacts, les objectifs..."
          />

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Button onClick={save} disabled={!dirty || saving}>
              {saving ? "⧳ SAUVEGARDE..." : "✓ ENREGISTRER"}
            </Button>
            <Button variant="secondary" onClick={resetDefault} disabled={value === defaultValue}>
              ⟳ RESTAURER PAR DÉFAUT
            </Button>
            {toast && (
              <span
                className="font-mono text-xs ml-2"
                style={{ color: "var(--color-green)" }}
              >
                {toast}
              </span>
            )}
          </div>

          <div
            className="mt-8 border-t pt-4"
            style={{ borderColor: "var(--color-border)" }}
          >
            <p
              className="mono-label mb-2"
              style={{ color: "var(--color-muted)" }}
            >
              VALEUR PAR DÉFAUT (référence)
            </p>
            <pre
              className="text-xs whitespace-pre-wrap font-sans px-3 py-2 border"
              style={{
                color: "var(--color-muted)",
                backgroundColor: "var(--color-paper)",
                borderColor: "var(--color-border)",
                borderRadius: "6px",
              }}
            >
              {defaultValue}
            </pre>
          </div>
        </>
      )}
    </div>
  );
}
