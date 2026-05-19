"use client";

import { useEffect } from "react";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { useAuth } from "@/components/auth/AuthProvider";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, configured, authOpen, openAuth } = useAuth();

  useEffect(() => {
    if (!configured || loading) return;
    if (!user) {
      openAuth("login");
    }
  }, [configured, loading, user, openAuth]);

  if (!configured) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-sand">
        <p className="text-sm text-steppe-deep/60">Загрузка…</p>
      </div>
    );
  }

  const showAuth = !user && authOpen;

  return (
    <>
      {children}
      {showAuth ? <AuthScreen /> : null}
    </>
  );
}
