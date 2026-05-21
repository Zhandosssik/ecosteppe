import { BottomNav } from "@/components/nav/BottomNav";
import { ProfilePageContent } from "@/components/profile/ProfilePageContent";

export default function ProfilePage() {
  return (
    <main className="flex h-dvh max-h-dvh flex-col bg-sand">
      <div className="flex-1 overflow-y-auto overscroll-contain px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <ProfilePageContent />
      </div>
      <BottomNav activeTab="profile" />
    </main>
  );
}
