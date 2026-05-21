import { BottomNav } from "@/components/nav/BottomNav";
import { ReportsScreen } from "@/components/report/ReportsScreen";

export default function ReportsPage() {
  return (
    <main className="flex h-dvh max-h-dvh flex-col bg-sand">
      <div className="flex min-h-0 flex-1 flex-col">
        <ReportsScreen />
      </div>
      <BottomNav activeTab="reports" />
    </main>
  );
}
