"use client";

import { useLanguage } from "@/lib/i18n/context";
import { ProfileScreen } from "@/components/profile/ProfileScreen";

export function ProfilePageContent() {
  const { t } = useLanguage();
  return (
    <>
      <h1 className="text-xl font-bold text-steppe-deep">{t.profile.title}</h1>
      <ProfileScreen />
    </>
  );
}
