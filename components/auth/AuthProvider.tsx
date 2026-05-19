"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type AuthView =
  | "login"
  | "register"
  | "verify"
  | "forgot"
  | "reset";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  configured: boolean;
  authOpen: boolean;
  authView: AuthView;
  pendingEmail: string;
  pendingPassword: string;
  openAuth: (view?: AuthView) => void;
  closeAuth: () => void;
  setAuthView: (view: AuthView) => void;
  setPendingEmail: (email: string) => void;
  setPendingPassword: (password: string) => void;
  clearPendingRegistration: () => void;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const configured = isSupabaseConfigured();

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(configured);
  const [authOpen, setAuthOpen] = useState(false);
  const [authView, setAuthView] = useState<AuthView>("login");
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingPassword, setPendingPassword] = useState("");

  const clearPendingRegistration = useCallback(() => {
    setPendingEmail("");
    setPendingPassword("");
  }, []);

  const refreshSession = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    setUser(data.session?.user ?? null);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    void refreshSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
      if (nextSession?.user) {
        setAuthOpen(false);
        setPendingEmail("");
        setPendingPassword("");
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, refreshSession]);

  const openAuth = useCallback((view: AuthView = "login") => {
    setAuthView(view);
    setAuthOpen(true);
  }, []);

  const closeAuth = useCallback(() => {
    setAuthOpen(false);
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setAuthOpen(true);
    setAuthView("login");
    clearPendingRegistration();
  }, [supabase, clearPendingRegistration]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      configured,
      authOpen,
      authView,
      pendingEmail,
      pendingPassword,
      openAuth,
      closeAuth,
      setAuthView,
      setPendingEmail,
      setPendingPassword,
      clearPendingRegistration,
      signOut,
      refreshSession,
    }),
    [
      user,
      session,
      loading,
      configured,
      authOpen,
      authView,
      pendingEmail,
      pendingPassword,
      openAuth,
      closeAuth,
      clearPendingRegistration,
      signOut,
      refreshSession,
    ],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
