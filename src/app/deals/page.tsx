import { ClosedDealsTable } from "@/components/deals/closed-deals-table";
import { DealsHeader } from "@/components/deals/deals-header";

export default function DealsPage() {
  return (
    <div className="space-y-6">
      <DealsHeader />
      <ClosedDealsTable />
    </div>
  );
}