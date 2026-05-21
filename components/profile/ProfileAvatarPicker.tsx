"use client";

import { useRef } from "react";
import { CameraIcon } from "@/components/icons/CameraIcon";

type ProfileAvatarPickerProps = {
  displayName: string;
  avatarUrl: string | null;
  disabled?: boolean;
  onPick: (file: File) => void;
};

export function ProfileAvatarPicker({
  displayName,
  avatarUrl,
  disabled,
  onPick,
}: ProfileAvatarPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const initial = displayName.trim().charAt(0).toUpperCase() || "Б";

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-steppe-light/30 ring-2 ring-white shadow-md transition active:scale-[0.98] disabled:opacity-60"
        aria-label="Изменить фото профиля"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-2xl font-semibold text-steppe-deep">
            {initial}
          </span>
        )}
        <span className="absolute inset-x-0 bottom-0 flex h-7 items-center justify-center bg-steppe-deep/55">
          <CameraIcon className="h-4 w-4 text-white" />
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
