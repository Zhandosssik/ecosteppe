"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import type { ProfileLocale, ProfilePayload } from "@/types/profile";

const CACHE_KEY = "ecosteppe-profile-v3";

type ProfileState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; data: ProfilePayload }
  | { status: "error"; message: string };

function readCache(): ProfilePayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ProfilePayload;
  } catch {
    return null;
  }
}

function writeCache(data: ProfilePayload) {
  sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
}

export function useProfile() {
  const { user, loading: authLoading, configured } = useAuth();
  const [state, setState] = useState<ProfileState>({ status: "idle" });
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!user) {
      setState({ status: "idle" });
      return;
    }

    if (!opts?.silent) {
      setState({ status: "loading" });
    }

    try {
      const res = await fetch("/api/profile", { cache: "no-store" });
      const json = (await res.json()) as ProfilePayload & { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Ошибка загрузки профиля");
      }
      writeCache(json);
      setState({ status: "ready", data: json });
    } catch (e) {
      const cached = readCache();
      if (cached && cached.xp > 0) {
        setState({ status: "ready", data: cached });
      } else {
        setState({
          status: "error",
          message: e instanceof Error ? e.message : "Ошибка загрузки",
        });
      }
    }
  }, [user]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("ecosteppe-profile-cache");
      sessionStorage.removeItem("ecosteppe-profile-v2");
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!configured || !user) {
      setState({ status: "idle" });
      return;
    }
    void load();
  }, [authLoading, configured, user, load]);

  const patchSettings = useCallback(
    async (patch: {
      locale?: ProfileLocale;
      notificationsEnabled?: boolean;
    }) => {
      setSyncing(true);
      try {
        const res = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        const json = (await res.json()) as ProfilePayload & { error?: string };
        if (!res.ok) throw new Error(json.error ?? "Ошибка сохранения");
        writeCache(json);
        setState({ status: "ready", data: json });
        return { ok: true as const };
      } catch (e) {
        return {
          ok: false as const,
          message: e instanceof Error ? e.message : "Ошибка",
        };
      } finally {
        setSyncing(false);
      }
    },
    [],
  );

  const uploadAvatar = useCallback(async (file: File) => {
    setSyncing(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });
      const json = (await res.json()) as {
        profile?: ProfilePayload;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Ошибка загрузки фото");
      if (json.profile) {
        writeCache(json.profile);
        setState({ status: "ready", data: json.profile });
      } else {
        await load({ silent: true });
      }
      return { ok: true as const };
    } catch (e) {
      return {
        ok: false as const,
        message: e instanceof Error ? e.message : "Ошибка",
      };
    } finally {
      setSyncing(false);
    }
  }, [load]);

  const applyVolunteer = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/profile/volunteer", { method: "POST" });
      const json = (await res.json()) as {
        profile?: ProfilePayload;
        message?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Ошибка");
      if (json.profile) {
        writeCache(json.profile);
        setState({ status: "ready", data: json.profile });
      }
      return { ok: true as const, message: json.message };
    } catch (e) {
      return {
        ok: false as const,
        message: e instanceof Error ? e.message : "Ошибка",
      };
    } finally {
      setSyncing(false);
    }
  }, []);

  return {
    state,
    syncing,
    reload: load,
    patchSettings,
    uploadAvatar,
    applyVolunteer,
  };
}
