import { ResourcesGrid } from "@/components/resources/resources-grid";
import { ResourcesHeader } from "@/components/resources/resources-header";

export default function ResourcesPage() {
  return (
    <div className="space-y-6">
      <ResourcesHeader />
      <ResourcesGrid />
    </div>
  );
}