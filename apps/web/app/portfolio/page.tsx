import { TopBlock } from "@/components/TopBar";
import { Card } from "@/components/ui";

export default function Page() {
  return (
    <div className="flex flex-col gap-4">
      <TopBlock title="Portfolio" />
      <Card><p className="text-sm text-ink-3">Coming soon.</p></Card>
    </div>
  );
}