"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";

interface ThemeOption {
  id: string;
  name: string;
}

export default function ContextePage() {
  const [value, setValue] = useState("");
  const [defaultValue, setDefaultValue] = useState("");
  const [initial, setInitial] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const [themeValue, setThemeValue] = useState("");
  const [themeInitial, setThemeInitial] = useState("");
  const [themeOptions, setThemeOptions] = useState<ThemeOption[]>([]);
  const [savingTheme, setSavingTheme] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/data/project/context").then((r) => r.json()),
      fetch("/api/data/project/theme").then((r) => r.json()),
    ]).then(([ctx, theme]) => {
      setValue(ctx.value || "");
      setInitial(ctx.value || "");
      setDefaultValue(ctx.default || "");
      setThemeValue(theme.value || "liteops");
      setThemeInitial(theme.value || "liteops");
      setThemeOptions(theme.options || []);
      setLoading(false);
    });
  }, []);

  const dirty = value !== initial;
  const themeDirty = themeValue !== themeInitial;

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

  async function saveTheme() {
    setSavingTheme(true);
    try {
      await fetch("/api/data/project/theme", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: themeValue }),
      });
      setThemeInitial(themeValue);
      setToast("Thème mis à jour — les prochains livrables utiliseront ce rendu");
      setTimeout(() => setToast(""), 3000);
    } catch {
      setToast("Erreur à la sauvegarde du thème");
    }
    setSavingTheme(false);
  }

  function resetDefault() {
    setValue(defaultValue);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">
      <div className="mb-6">
        <h1
          className="font-mono uppercase tracking-wider"
          style={{ fontSize: "12px", letterSpacing: "0.12em", color: "var(--color-ink)" }}
        >
          Contexte mission
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
          Ce texte est injecté en tête de chaque prompt LLM (génération de tâches, de livrables, parsing de CR, recalibration, création de document). Modifie-le pour adapter le ton, les chiffres, le périmètre, les contacts... Toutes les générations suivantes s&apos;adapteront automatiquement.
        </p>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          Chargement...
        </p>
      ) : (
        <>
          <label className="mono-label block mb-2" style={{ color: "var(--color-muted)" }}>
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
          </div>

          <div
            className="mt-10 pt-6 border-t"
            style={{ borderColor: "var(--color-border)" }}
          >
            <label className="mono-label block mb-2" style={{ color: "var(--color-muted)" }}>
              THÈME DE RENDU DES LIVRABLES
            </label>
            <p className="text-sm mb-3" style={{ color: "var(--color-muted)" }}>
              Palette, typographie, en-tête et nommage des fichiers générés (DOCX / XLSX / PPTX).
              La structure du contenu est identique quelle que soit l&apos;option choisie.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={themeValue}
                onChange={(e) => setThemeValue(e.target.value)}
                className="text-sm bg-white border px-3 py-2 font-sans outline-none min-h-[44px]"
                style={{
                  borderColor: "var(--color-border)",
                  borderRadius: "6px",
                  color: "var(--color-ink)",
                }}
              >
                {themeOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              <Button onClick={saveTheme} disabled={!themeDirty || savingTheme}>
                {savingTheme ? "⧳ SAUVEGARDE..." : "✓ APPLIQUER LE THÈME"}
              </Button>
            </div>
          </div>

          {toast && (
            <div
              className="mt-4 px-3 py-2 font-mono text-xs inline-block"
              style={{
                backgroundColor: "var(--color-green)",
                color: "var(--color-ink)",
                borderRadius: "6px",
              }}
            >
              {toast}
            </div>
          )}

          <div className="mt-8 border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
            <p className="mono-label mb-2" style={{ color: "var(--color-muted)" }}>
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
