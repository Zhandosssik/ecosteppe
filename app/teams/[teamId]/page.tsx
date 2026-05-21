import { BottomNav } from "@/components/nav/BottomNav";
import { TeamDetailScreen } from "@/components/teams/TeamDetailScreen";

type PageProps = { params: Promise<{ teamId: string }> };

export default async function TeamDetailPage({ params }: PageProps) {
  const { teamId } = await params;

  return (
    <main className="flex h-dvh max-h-dvh flex-col bg-sand">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <TeamDetailScreen teamId={teamId} />
      </div>
      <BottomNav activeTab="teams" />
    </main>
  );
}
