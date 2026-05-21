"use client";

import { useRef, useState } from "react";

type CreateTeamDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (teamId: string) => void;
};

export function CreateTeamDialog({
  open,
  onClose,
  onCreated,
}: CreateTeamDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  function onFileChange(file: File | undefined) {
    if (!file) {
      setLogoPreview(null);
      return;
    }
    setLogoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const form = new FormData();
      form.set("name", name.trim());
      form.set("description", description.trim());
      const file = fileRef.current?.files?.[0];
      if (file) form.set("logo", file);

      const res = await fetch("/api/teams", { method: "POST", body: form });
      const json = (await res.json()) as {
        team?: { id: string };
        joined?: boolean;
        error?: string;
        detail?: string;
      };
      if (!res.ok) {
        throw new Error(json.detail ?? json.error ?? "Ошибка создания");
      }
      if (!json.team?.id) {
        throw new Error("Команда создана, но id не получен");
      }

      onCreated(json.team.id);
      setName("");
      setDescription("");
      setLogoPreview(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-steppe-deep/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-team-title"
    >
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
      >
        <h2 id="create-team-title" className="text-lg font-semibold text-steppe-deep">
          Создать команду
        </h2>

        <label className="mt-4 block text-sm font-medium text-steppe-deep">
          Название
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            maxLength={80}
            className="mt-1 min-h-11 w-full rounded-xl border border-sand-dark/80 px-3 text-steppe-deep outline-none focus:border-steppe-mid"
          />
        </label>

        <label className="mt-3 block text-sm font-medium text-steppe-deep">
          Описание
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={500}
            className="mt-1 w-full rounded-xl border border-sand-dark/80 px-3 py-2 text-steppe-deep outline-none focus:border-steppe-mid"
          />
        </label>

        <label className="mt-3 block text-sm font-medium text-steppe-deep">
          Логотип
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={(e) => onFileChange(e.target.files?.[0])}
            className="mt-1 block w-full text-sm"
          />
        </label>
        {logoPreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoPreview}
            alt=""
            className="mt-2 h-16 w-16 rounded-full object-cover"
          />
        ) : null}

        {error ? (
          <p className="mt-3 text-sm text-red-700">{error}</p>
        ) : null}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 flex-1 rounded-xl border border-sand-dark bg-white text-sm font-medium text-steppe-deep"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="min-h-11 flex-1 rounded-xl bg-steppe-deep text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? "Создание…" : "Создать"}
          </button>
        </div>
      </form>
    </div>
  );
}
