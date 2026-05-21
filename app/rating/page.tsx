import { BottomNav } from "@/components/nav/BottomNav";
import { RatingScreen } from "@/components/rating/RatingScreen";

export default function RatingPage() {
  return (
    <main className="flex h-dvh max-h-dvh flex-col bg-sand">
      <div className="flex min-h-0 flex-1 flex-col">
        <RatingScreen />
      </div>
      <BottomNav activeTab="rating" />
    </main>
  );
}
