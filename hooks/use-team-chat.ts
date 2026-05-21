"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  addPendingMessage,
  clearPending,
  mergeMessages,
  readTeamChatCache,
  saveSyncedMessages,
} from "@/lib/teams/chat-storage";
import type { TeamMessage } from "@/types/teams";

export function useTeamChat(teamId: string, enabled: boolean) {
  const { user } = useAuth();
  const supabase = createSupabaseBrowserClient();
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const displayName =
    user?.user_metadata?.full_name ??
    user?.user_metadata?.name ??
    user?.email?.split("@")[0] ??
    "Батыр";

  const loadMessages = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const cache = readTeamChatCache(teamId);
    if (cache) {
      setMessages(
        mergeMessages([], cache.messages, cache.pending, user?.id ?? ""),
      );
    }

    try {
      const res = await fetch(`/api/teams/${teamId}/messages`);
      const json = (await res.json()) as {
        messages?: TeamMessage[];
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Ошибка чата");

      const server = json.messages ?? [];
      const merged = mergeMessages(
        server,
        cache?.messages ?? [],
        cache?.pending ?? [],
        user?.id ?? "",
      );
      setMessages(merged);
      saveSyncedMessages(teamId, server);
      setError(null);
    } catch (e) {
      if (!cache) {
        setError(e instanceof Error ? e.message : "Ошибка чата");
      }
    } finally {
      setLoading(false);
    }
  }, [enabled, teamId, user?.id]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!enabled || !supabase) return;

    const channel = supabase
      .channel(`team-chat-${teamId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "team_messages",
          filter: `team_id=eq.${teamId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            team_id: string;
            user_id: string;
            body: string;
            created_at: string;
          };
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            const next: TeamMessage = {
              id: row.id,
              teamId: row.team_id,
              userId: row.user_id,
              body: row.body,
              createdAt: row.created_at,
              authorName:
                row.user_id === user?.id ? displayName : "Батыр",
            };
            const cache = readTeamChatCache(teamId);
            const merged = [...prev.filter((m) => !m.id.startsWith("pending-")), next];
            saveSyncedMessages(
              teamId,
              merged.filter((m) => !m.id.startsWith("pending-")),
            );
            return merged;
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, supabase, teamId, user?.id, displayName]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(
    async (body: string) => {
      const text = body.trim();
      if (!text || !user || !enabled) return;

      setSending(true);
      const tempId = `pending-${crypto.randomUUID()}`;
      const pending = {
        tempId,
        body: text,
        createdAt: new Date().toISOString(),
        userId: user.id,
        authorName: displayName,
      };

      addPendingMessage(teamId, pending);
      setMessages((prev) =>
        mergeMessages(prev, [], [pending], user.id),
      );

      const flushPending = async () => {
        try {
          const res = await fetch(`/api/teams/${teamId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ body: text }),
          });
          const json = (await res.json()) as {
            message?: TeamMessage;
            error?: string;
          };
          if (!res.ok) throw new Error(json.error ?? "Не отправлено");
          clearPending(teamId, tempId);
          if (json.message) {
            setMessages((prev) => {
              const without = prev.filter((m) => m.id !== tempId);
              if (without.some((m) => m.id === json.message!.id)) return without;
              return [...without, json.message!];
            });
          }
          setError(null);
        } catch (e) {
          setError(
            e instanceof Error
              ? e.message
              : "Сообщение сохранено локально. Отправится при подключении.",
          );
        } finally {
          setSending(false);
        }
      };

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setSending(false);
        setError("Офлайн: сообщение сохранено локально");
        return;
      }

      await flushPending();
    },
    [displayName, enabled, teamId, user],
  );

  const retryPending = useCallback(async () => {
    const cache = readTeamChatCache(teamId);
    if (!cache?.pending.length) return;
    for (const p of cache.pending) {
      try {
        const res = await fetch(`/api/teams/${teamId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: p.body }),
        });
        if (res.ok) clearPending(teamId, p.tempId);
      } catch {
        /* keep pending */
      }
    }
    await loadMessages();
  }, [loadMessages, teamId]);

  useEffect(() => {
    const onOnline = () => void retryPending();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [retryPending]);

  return {
    messages,
    loading,
    sending,
    error,
    sendMessage,
    bottomRef,
    currentUserId: user?.id ?? null,
  };
}
