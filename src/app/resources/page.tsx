"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ResourcesGrid } from "@/components/resources/resources-grid";
import { ResourcesHeader } from "@/components/resources/resources-header";
import { Loader2 } from "lucide-react";

// Loading component for Suspense
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    </div>
  );
}

// Separate component that uses useSearchParams
function ResourcesContent() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
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
      <ResourcesHeader 
        onResourcesUpdate={handleResourcesUpdate}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      <ResourcesGrid key={refreshKey} searchQuery={searchQuery} />
    </div>
  );
}

// Main page component with Suspense wrapper
export default function ResourcesPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResourcesContent />
    </Suspense>
  );
}