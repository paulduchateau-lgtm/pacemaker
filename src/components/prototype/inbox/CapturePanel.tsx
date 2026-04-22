"use client";

import { useState } from "react";
import { useStore } from "@/store";
import { resizeImage } from "@/lib/image-utils";
import type { VisionExtraction } from "@/types";
import CameraButton from "@/components/capture/CameraButton";
import PhotoPreview from "@/components/capture/PhotoPreview";
import ExtractionResult from "@/components/capture/ExtractionResult";

export default function CapturePanel() {
  const { currentWeek, fetchTasks, fetchRisks, fetchEvents } = useStore();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<VisionExtraction | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function handleCapture(file: File) {
    setLoading(true);
    setExtraction(null);
    setStatus(null);
    try {
      const resized = await resizeImage(file, 1600, 0.85);
      setPreviewUrl(URL.createObjectURL(resized));
      const fd = new FormData();
      fd.append("file", resized, "capture.jpg");
      const res = await fetch("/api/vision/extract", { method: "POST", body: fd });
      const data = await res.json();
      if (data.error) setStatus(`Erreur : ${data.error}`);
      else {
        setBlobUrl(data.blobUrl);
        setExtraction(data.extraction);
      }
    } catch {
      setStatus("Erreur réseau");
    }
    setLoading(false);
  }

  async function post(path: string, body: unknown) {
    return fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  }

  async function handleIntegrate() {
    if (!extraction || !blobUrl) return;
    setLoading(true);
    try {
      for (const el of extraction.detected_elements) {
        if (el.type === "action")
          await post("/api/data/tasks", { weekId: currentWeek, label: el.content, source: "vision" });
        else if (el.type === "risk")
          await post("/api/data/risks", { label: el.content, impact: 3, probability: 3 });
        else if (el.type === "decision") {
          const evtRes = await post("/api/data/events", { type: "decision", label: el.content, weekId: currentWeek });
          let sourceRef: string | null = null;
          try { sourceRef = (await evtRes.json())?.id ?? null; } catch { /* ignore */ }
          await post("/api/decisions", {
            statement: el.content, author: "paul", status: "actée",
            sourceType: "vision", sourceRef, weekId: currentWeek,
          });
        }
      }
      await post("/api/docs", {
        title: `Capture S${currentWeek} — ${extraction.summary.slice(0, 50)}`,
        type: "photo", source: "vision", weekId: currentWeek, blobUrl,
        content: extraction.ocr_text,
      });
      await post("/api/data/events", {
        type: "vision",
        label: `Photo analysée — ${extraction.detected_elements.length} éléments`,
        weekId: currentWeek, content: extraction.summary,
      });
      await Promise.all([fetchTasks(), fetchRisks(), fetchEvents()]);
      setStatus("Intégré avec succès");
      reset();
    } catch {
      setStatus("Erreur lors de l'intégration");
    }
    setLoading(false);
  }

  async function handleKeepAsDoc() {
    if (!extraction || !blobUrl) return;
    setLoading(true);
    try {
      await post("/api/docs", {
        title: `Capture S${currentWeek} — ${extraction.summary.slice(0, 50)}`,
        type: "photo", source: "vision", weekId: currentWeek, blobUrl,
        content: extraction.ocr_text,
      });
      setStatus("Gardé en documentation");
      reset();
    } catch {
      setStatus("Erreur");
    }
    setLoading(false);
  }

  function reset() {
    setPreviewUrl(null);
    setBlobUrl(null);
    setExtraction(null);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ fontSize: 13.5, color: "var(--muted)" }}>
        Photo d&apos;un tableau blanc, Post-it, slide ou schéma manuscrit — l&apos;IA extrait
        décisions, actions, risques et les intègre au plan.
      </p>
      {!previewUrl && !extraction && <CameraButton onCapture={handleCapture} disabled={loading} />}
      {loading && !extraction && (
        <div className="card" style={{ padding: 16, textAlign: "center" }}>
          <span className="mono" style={{ color: "var(--muted)" }}>⧳ ANALYSE EN COURS…</span>
        </div>
      )}
      {previewUrl && !extraction && !loading && (
        <PhotoPreview imageUrl={previewUrl} onRemove={reset} />
      )}
      {extraction && (
        <ExtractionResult
          extraction={extraction}
          onIntegrate={handleIntegrate}
          onKeepAsDoc={handleKeepAsDoc}
          onReject={reset}
          loading={loading}
        />
      )}
      {status && <p className="mono" style={{ color: "var(--green-deep)" }}>{status}</p>}
    </div>
  );
}
