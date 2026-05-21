"use client";

import { useState } from "react";
import { AvatarBadge } from "@/components/rating/AvatarBadge";
import { useTeamChat } from "@/hooks/use-team-chat";

export function TeamChat({
  teamId,
  enabled,
}: {
  teamId: string;
  enabled: boolean;
}) {
  const [draft, setDraft] = useState("");
  const { messages, loading, sending, error, sendMessage, bottomRef, currentUserId } =
    useTeamChat(teamId, enabled);

  if (!enabled) {
    return (
      <p className="text-sm text-steppe-deep/55">
        Вступите в команду, чтобы писать в чат
      </p>
    );
  }

  return (
    <div className="flex flex-col rounded-2xl border border-sand-dark/60 bg-white">
      <div className="max-h-56 overflow-y-auto px-3 py-3">
        {loading ? (
          <p className="text-sm text-steppe-deep/55">Загрузка чата…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-steppe-deep/55">Пока нет сообщений</p>
        ) : (
          <ul className="space-y-3">
            {messages.map((msg) => {
              const mine = msg.userId === currentUserId;
              return (
                <li
                  key={msg.id}
                  className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}
                >
                  <AvatarBadge
                    name={msg.authorName ?? "Батыр"}
                    imageUrl={msg.authorAvatar}
                    size="sm"
                  />
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                      mine
                        ? "bg-steppe-deep text-white"
                        : "bg-sand text-steppe-deep"
                    } ${msg.id.startsWith("pending-") ? "opacity-70" : ""}`}
                  >
                    <p className="text-[10px] font-medium opacity-80">
                      {msg.authorName ?? "Батыр"}
                    </p>
                    <p className="mt-0.5 whitespace-pre-wrap break-words">
                      {msg.body}
                    </p>
                    <p className="mt-1 text-[10px] opacity-60">
                      {new Date(msg.createdAt).toLocaleString("ru-RU", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div ref={bottomRef} />
      </div>

      {error ? (
        <p className="border-t border-sand-dark/50 px-3 py-1 text-xs text-amber-800">
          {error}
        </p>
      ) : null}

      <form
        className="flex gap-2 border-t border-sand-dark/60 p-2"
        onSubmit={(e) => {
          e.preventDefault();
          void sendMessage(draft).then(() => setDraft(""));
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Сообщение команде…"
          maxLength={2000}
          className="min-h-11 flex-1 rounded-xl border border-sand-dark/80 px-3 text-sm outline-none focus:border-steppe-mid"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="min-h-11 shrink-0 rounded-xl bg-steppe-deep px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          →
        </button>
      </form>
    </div>
  );
}
