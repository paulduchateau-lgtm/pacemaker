"use client";

import { useState } from "react";
import { useStore } from "@/store";
import { resizeImage } from "@/lib/image-utils";
import type { VisionExtraction } from "@/types";
import CameraButton from "@/components/capture/CameraButton";
import PhotoPreview from "@/components/capture/PhotoPreview";
import ExtractionResult from "@/components/capture/ExtractionResult";
import Card from "@/components/ui/Card";

export default function CapturePage() {
  const { currentWeek, fetchTasks, fetchRisks, fetchEvents } = useStore();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<VisionExtraction | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleCapture = async (file: File) => {
    setLoading(true);
    setExtraction(null);
    setStatus(null);

    try {
      const resized = await resizeImage(file, 1600, 0.85);
      setPreviewUrl(URL.createObjectURL(resized));

      const formData = new FormData();
      formData.append("file", resized, "capture.jpg");

      const res = await fetch("/api/vision/extract", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.error) {
        setStatus(`Erreur : ${data.error}`);
      } else {
        setBlobUrl(data.blobUrl);
        setExtraction(data.extraction);
      }
    } catch {
      setStatus("Erreur r\u00e9seau");
    }
    setLoading(false);
  };

  const handleIntegrate = async () => {
    if (!extraction || !blobUrl) return;
    setLoading(true);

    try {
      // Create entities from detected elements
      for (const el of extraction.detected_elements) {
        if (el.type === "action") {
          await fetch("/api/data/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              weekId: currentWeek,
              label: el.content,
              source: "vision",
            }),
          });
        } else if (el.type === "risk") {
          await fetch("/api/data/risks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              label: el.content,
              impact: 3,
              probability: 3,
            }),
          });
        } else if (el.type === "decision") {
          await fetch("/api/data/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "decision",
              label: el.content,
              weekId: currentWeek,
            }),
          });
        }
      }

      // Index OCR text as document
      await fetch("/api/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Capture S${currentWeek} \u2014 ${extraction.summary.slice(0, 50)}`,
          type: "photo",
          source: "vision",
          weekId: currentWeek,
          blobUrl,
          content: extraction.ocr_text,
        }),
      });

      // Log vision event
      await fetch("/api/data/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "vision",
          label: `Photo analys\u00e9e \u2014 ${extraction.detected_elements.length} \u00e9l\u00e9ments`,
          weekId: currentWeek,
          content: extraction.summary,
        }),
      });

      await Promise.all([fetchTasks(), fetchRisks(), fetchEvents()]);
      setStatus("Int\u00e9gr\u00e9 avec succ\u00e8s");
      reset();
    } catch {
      setStatus("Erreur lors de l'int\u00e9gration");
    }
    setLoading(false);
  };

  const handleKeepAsDoc = async () => {
    if (!extraction || !blobUrl) return;
    setLoading(true);
    try {
      await fetch("/api/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Capture S${currentWeek} \u2014 ${extraction.summary.slice(0, 50)}`,
          type: "photo",
          source: "vision",
          weekId: currentWeek,
          blobUrl,
          content: extraction.ocr_text,
        }),
      });
      setStatus("Gard\u00e9 en documentation");
      reset();
    } catch {
      setStatus("Erreur");
    }
    setLoading(false);
  };

  const reset = () => {
    setPreviewUrl(null);
    setBlobUrl(null);
    setExtraction(null);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-medium" style={{ color: "var(--color-ink)" }}>
        Capture photo
      </h1>
      <p className="text-sm" style={{ color: "var(--color-muted)" }}>
        {"Prenez une photo d'un tableau blanc, de Post-it, d'une slide ou d'un schéma. L'IA analysera le contenu."}
      </p>

      {!previewUrl && !extraction && (
        <CameraButton onCapture={handleCapture} disabled={loading} />
      )}

      {loading && !extraction && (
        <Card>
          <p className="mono-label text-center" style={{ color: "var(--color-muted)" }}>
            &#x29F3; ANALYSE EN COURS...
          </p>
        </Card>
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

      {status && (
        <p className="mono-label" style={{ color: "var(--color-green)" }}>
          {status}
        </p>
      )}
    </div>
  );
}
