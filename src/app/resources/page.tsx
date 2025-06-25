"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ResourcesGrid } from "@/components/resources/resources-grid";
import { ResourcesHeader } from "@/components/resources/resources-header";

export default function ResourcesPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check for success/error messages from Google auth
    const googleConnected = searchParams.get('google_connected');
    const error = searchParams.get('error');

    if (googleConnected === 'true') {
      // You could show a success toast here
      console.log('Successfully connected to Google Drive!');
    } else if (error) {
      // You could show an error toast here
      console.error('Google Drive connection error:', error);
    }
  }, [searchParams]);

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