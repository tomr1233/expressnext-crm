"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, Cloud } from "lucide-react";
import { UploadModal } from "./upload-modal";
import { GoogleDriveSyncModal } from "./google-drive-sync-modal";

interface ResourcesHeaderProps {
  onResourcesUpdate?: () => void;
}

export function ResourcesHeader({ onResourcesUpdate }: ResourcesHeaderProps) {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);

  const handleUploadComplete = () => {
    // Trigger a refresh of the resources list
    if (onResourcesUpdate) {
      onResourcesUpdate();
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Resources</h1>
            <p className="text-gray-600 mt-2">Internal knowledge base and resource library</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSyncModalOpen(true)}>
              <Cloud className="h-4 w-4 mr-2" />
              Google Drive Sync
            </Button>
            <Button size="sm" onClick={() => setUploadModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Upload Resource
            </Button>
          </div>
        </div>
        
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search resources..."
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
          />
        </div>
      </div>

      <UploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        onUploadComplete={handleUploadComplete}
      />
      
      <GoogleDriveSyncModal
        open={syncModalOpen}
        onOpenChange={setSyncModalOpen}
        onSyncComplete={handleUploadComplete}
      />
    </>
  );
}
