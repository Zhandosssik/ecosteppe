import { BottomNav } from "@/components/nav/BottomNav";

export default function ProfilePage() {
  return (
    <main className="flex h-dvh max-h-dvh flex-col bg-sand">
      <div className="flex-1 overflow-y-auto px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-6">
        <h1 className="text-xl font-semibold text-steppe-deep">Профиль</h1>
        <p className="mt-2 text-sm leading-relaxed text-steppe-deep/60">
          Раздел в разработке. Здесь появятся данные вашего аккаунта батыра.
        </p>
      </div>
      <BottomNav activeTab="profile" />
    </main>
  );
}
