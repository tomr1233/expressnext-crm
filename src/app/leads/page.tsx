import { LeadsList } from "@/components/leads/leads-list";
import { LeadsHeader } from "@/components/leads/leads-header";

export default function LeadsPage() {
  return (
    <div className="space-y-6">
      <LeadsHeader />
      <LeadsList />
    </div>
  );
}