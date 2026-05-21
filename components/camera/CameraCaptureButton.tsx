"use client";

import { useRef, type ChangeEvent } from "react";
import { CameraIcon } from "@/components/icons/CameraIcon";

type CameraCaptureButtonProps = {
  onPhoto: (file: File) => void;
  disabled?: boolean;
  variant?: "default" | "fab";
  label?: string;
};

export function CameraCaptureButton({
  onPhoto,
  disabled = false,
  variant = "default",
  label,
}: CameraCaptureButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    onPhoto(file);
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        aria-label={label ?? "Сфотографировать место"}
        className={
          variant === "fab"
            ? "flex h-14 min-w-[3.5rem] items-center justify-center gap-2 rounded-full bg-steppe-light px-5 text-steppe-deep shadow-xl shadow-steppe-deep/25 ring-4 ring-white transition active:scale-95 disabled:opacity-50"
            : "flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-steppe-deep shadow-lg shadow-steppe-deep/20 ring-1 ring-white/80 transition active:scale-95 disabled:opacity-50"
        }
      >
        <CameraIcon className={variant === "fab" ? "h-6 w-6" : "h-6 w-6"} />
        {variant === "fab" && label ? (
          <span className="text-sm font-semibold">{label}</span>
        ) : null}
      </button>
    </>
  );
}
