"use client";

import Image from "next/image";

type ReportPhotoLightboxProps = {
  photoUrl: string;
  onClose: () => void;
  label?: string;
};

export function ReportPhotoLightbox({
  photoUrl,
  onClose,
  label = "Фото зоны",
}: ReportPhotoLightboxProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/95"
      role="dialog"
      aria-modal
      aria-label={label}
    >
      <div className="flex shrink-0 items-center justify-end px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-2xl leading-none text-white transition active:scale-95"
        >
          ×
        </button>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="relative min-h-0 flex-1"
        aria-label="Закрыть фото"
      >
        <Image
          src={photoUrl}
          alt={label}
          fill
          className="object-contain"
          sizes="100vw"
          unoptimized
          priority
        />
      </button>
    </div>
  );
}
