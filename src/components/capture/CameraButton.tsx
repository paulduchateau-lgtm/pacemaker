"use client";

import { useRef } from "react";
import Button from "@/components/ui/Button";

interface CameraButtonProps {
  onCapture: (file: File) => void;
  disabled?: boolean;
}

export default function CameraButton({ onCapture, disabled }: CameraButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onCapture(file);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
      <Button
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="w-full md:w-auto"
      >
        &#x25C6; PRENDRE UNE PHOTO
      </Button>
    </>
  );
}
