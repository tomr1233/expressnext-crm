"use client";

import { useState } from "react";
import { ResourcesGrid } from "@/components/resources/resources-grid";
import { ResourcesHeader } from "@/components/resources/resources-header";

export default function ResourcesPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleResourcesUpdate = () => {
    // Force refresh of ResourcesGrid by changing key
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      <ResourcesHeader onResourcesUpdate={handleResourcesUpdate} />
      <ResourcesGrid key={refreshKey} />
    </div>
  );
}