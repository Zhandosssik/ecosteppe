import { BottomNav } from "@/components/nav/BottomNav";
import { TeamsScreen } from "@/components/teams/TeamsScreen";

export default function TeamsPage() {
  return (
    <main className="flex h-dvh max-h-dvh flex-col bg-sand">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <TeamsScreen />
      </div>
      <BottomNav activeTab="teams" />
    </main>
  );
}
