"use client";

import { useEffect, useState } from "react";
import type { ReportPickOption } from "@/types/teams";

type ScheduleCleanupDialogProps = {
  open: boolean;
  teamId: string;
  onClose: () => void;
  onScheduled: () => void;
};

export function ScheduleCleanupDialog({
  open,
  teamId,
  onClose,
  onScheduled,
}: ScheduleCleanupDialogProps) {
  const [reports, setReports] = useState<ReportPickOption[]>([]);
  const [reportId, setReportId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void fetch(`/api/teams/${teamId}/reports`)
      .then((r) => r.json())
      .then((json: { reports?: ReportPickOption[] }) => {
        setReports(json.reports ?? []);
        if (json.reports?.[0]) setReportId(json.reports[0].id);
      })
      .finally(() => setLoading(false));
  }, [open, teamId]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/teams/${teamId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: reportId || undefined,
          scheduledAt: new Date(scheduledAt).toISOString(),
          title: title.trim() || undefined,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Ошибка");
      onScheduled();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setSubmitting(false);
    }
  }

  const minLocal = new Date();
  minLocal.setMinutes(minLocal.getMinutes() - minLocal.getTimezoneOffset());
  const minValue = minLocal.toISOString().slice(0, 16);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-steppe-deep/40 p-4 sm:items-center">
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-steppe-deep">
          Запланировать уборку
        </h2>

        {loading ? (
          <p className="mt-4 text-sm text-steppe-deep/55">Загрузка свалок…</p>
        ) : (
          <>
            <label className="mt-4 block text-sm font-medium text-steppe-deep">
              Свалка из списка
              <select
                value={reportId}
                onChange={(e) => setReportId(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-xl border border-sand-dark/80 px-3"
              >
                {reports.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.notes?.trim() || `Точка ${r.lat.toFixed(2)}, ${r.lng.toFixed(2)}`}
                  </option>
                ))}
              </select>
            </label>
            <p className="mt-2 text-xs text-steppe-deep/50">
              Или выберите точку на главной карте перед планированием.
            </p>
          </>
        )}

        <label className="mt-3 block text-sm font-medium text-steppe-deep">
          Дата и время
          <input
            type="datetime-local"
            required
            min={minValue}
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="mt-1 min-h-11 w-full rounded-xl border border-sand-dark/80 px-3"
          />
        </label>

        <label className="mt-3 block text-sm font-medium text-steppe-deep">
          Название (необязательно)
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Уборка у родника"
            className="mt-1 min-h-11 w-full rounded-xl border border-sand-dark/80 px-3"
          />
        </label>

        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 flex-1 rounded-xl border border-sand-dark text-sm font-medium"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={submitting || !scheduledAt}
            className="min-h-11 flex-1 rounded-xl bg-steppe-deep text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? "Сохранение…" : "Запланировать"}
          </button>
        </div>
      </form>
    </div>
  );
}
