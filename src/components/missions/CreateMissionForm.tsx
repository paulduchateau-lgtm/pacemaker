"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ACTIVE_MISSION_COOKIE } from "@/lib/mission-constants";

type FormState = {
  slug: string;
  label: string;
  client: string;
  startDate: string;
  endDate: string;
  theme: string;
};

const EMPTY: FormState = {
  slug: "",
  label: "",
  client: "",
  startDate: "",
  endDate: "",
  theme: "liteops",
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export default function CreateMissionForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: form.slug || slugify(form.label),
          label: form.label,
          client: form.client || null,
          startDate: form.startDate,
          endDate: form.endDate,
          theme: form.theme || "liteops",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Création impossible");
      // Bascule immédiatement sur la nouvelle mission via le cookie
      document.cookie = `${ACTIVE_MISSION_COOKIE}=${json.mission.slug}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
      router.push(`/admin/missions/${json.mission.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setSubmitting(false);
    }
  }

  const labelCls = "block mono-label mb-1";
  const inputCls =
    "w-full px-3 py-2 text-sm";
  const inputStyle: React.CSSProperties = {
    backgroundColor: "#FFFFFF",
    border: "1px solid var(--color-border)",
    borderRadius: "6px",
    color: "var(--color-ink)",
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className={labelCls} style={{ color: "var(--color-muted)" }}>
          Libellé *
        </label>
        <input
          className={inputCls}
          style={inputStyle}
          value={form.label}
          onChange={(e) => update("label", e.target.value)}
          required
          placeholder="Agirc-Arrco — DAS Power BI"
        />
      </div>

      <div>
        <label className={labelCls} style={{ color: "var(--color-muted)" }}>
          Slug (laisser vide pour dériver du libellé)
        </label>
        <input
          className={inputCls}
          style={inputStyle}
          value={form.slug}
          onChange={(e) => update("slug", e.target.value)}
          placeholder={form.label ? slugify(form.label) : "agirc-arrco-2026"}
          pattern="[a-z0-9-]{3,60}"
        />
      </div>

      <div>
        <label className={labelCls} style={{ color: "var(--color-muted)" }}>
          Client
        </label>
        <input
          className={inputCls}
          style={inputStyle}
          value={form.client}
          onChange={(e) => update("client", e.target.value)}
          placeholder="Agirc-Arrco"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls} style={{ color: "var(--color-muted)" }}>
            Date de début *
          </label>
          <input
            className={inputCls}
            style={inputStyle}
            type="date"
            value={form.startDate}
            onChange={(e) => update("startDate", e.target.value)}
            required
          />
        </div>
        <div>
          <label className={labelCls} style={{ color: "var(--color-muted)" }}>
            Date de fin *
          </label>
          <input
            className={inputCls}
            style={inputStyle}
            type="date"
            value={form.endDate}
            onChange={(e) => update("endDate", e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <label className={labelCls} style={{ color: "var(--color-muted)" }}>
          Thème livrables
        </label>
        <select
          className={inputCls}
          style={inputStyle}
          value={form.theme}
          onChange={(e) => update("theme", e.target.value)}
        >
          <option value="liteops">liteops (défaut)</option>
          <option value="agirc-arrco">agirc-arrco</option>
        </select>
      </div>

      {error && (
        <div
          className="px-3 py-2 text-xs"
          style={{
            color: "var(--color-alert)",
            backgroundColor: "#FDECEA",
            borderRadius: "6px",
          }}
        >
          {error}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 mono-label"
          style={{
            backgroundColor: "var(--color-green)",
            color: "var(--color-ink)",
            borderRadius: "6px",
            opacity: submitting ? 0.5 : 1,
          }}
        >
          {submitting ? "CRÉATION..." : "CRÉER LA MISSION"}
        </button>
      </div>
    </form>
  );
}
