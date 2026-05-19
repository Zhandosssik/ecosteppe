import { BottomNav } from "@/components/nav/BottomNav";
import { ProfileContent } from "@/components/profile/ProfileContent";

export default function ProfilePage() {
  return (
    <main className="flex h-dvh max-h-dvh flex-col bg-sand">
      <div className="flex-1 overflow-y-auto px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-6">
        <h1 className="text-xl font-semibold text-steppe-deep">Профиль</h1>
        <ProfileContent />
      </div>
      <BottomNav activeTab="profile" />
    </main>
  );
}
