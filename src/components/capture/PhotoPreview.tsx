"use client";

interface PhotoPreviewProps {
  imageUrl: string;
  onRemove: () => void;
}

export default function PhotoPreview({ imageUrl, onRemove }: PhotoPreviewProps) {
  return (
    <div className="relative">
      <img
        src={imageUrl}
        alt="Capture"
        className="w-full max-h-[400px] object-contain"
        style={{ borderRadius: "6px", border: "1px solid var(--color-border)" }}
      />
      <button
        onClick={onRemove}
        className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center min-h-[44px] min-w-[44px]"
        style={{
          backgroundColor: "var(--color-ink)",
          color: "var(--color-paper)",
          borderRadius: "6px",
          opacity: 0.8,
        }}
      >
        &#x2715;
      </button>
    </div>
  );
}
