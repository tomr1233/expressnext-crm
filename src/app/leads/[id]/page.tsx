import { LeadDetail } from "@/components/leads/lead-detail";

interface LeadDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { id } = await params;
  
  return (
    <div className="space-y-6">
      <LeadDetail leadId={id} />
    </div>
  );
}