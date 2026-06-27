export const dynamic = "force-dynamic";

import MorningRecapBanner    from "@/components/MorningRecapBanner";
import MindfulCheckIn        from "@/components/MindfulCheckIn";
import DuduBlueprintBridge   from "@/components/DuduBlueprintBridge";
import DashboardGrid         from "@/components/DashboardGrid";
import WorldClockCard        from "@/components/widgets/WorldClockCard";
import DashboardFooter       from "@/components/DashboardFooter";
import NightlyReviewModal    from "@/components/NightlyReviewModal";
import QuickActionsMenu      from "@/components/ui/QuickActionsMenu";
import GlobalTaskModalMount  from "@/components/GlobalTaskModalMount";

export default function DashboardPage() {
  return (
    <main className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <MorningRecapBanner />
        {/* Renders DashboardHeader here + DuduAssistant (fixed-positioned, so its DOM
            location doesn't affect where it appears) — both share blueprintRequestId state,
            which page.tsx can't hold itself without losing force-dynamic (see bridge file). */}
        <DuduBlueprintBridge />
        <MindfulCheckIn />
        <DashboardGrid />
        <div className="mt-4">
          <WorldClockCard />
        </div>
        <DashboardFooter />
      </div>
      <NightlyReviewModal />
      <QuickActionsMenu />
      <GlobalTaskModalMount />
    </main>
  );
}
