"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, Cloud, RefreshCw, Zap, ZapOff } from "lucide-react";
import { UploadModal } from "./upload-modal";
import { GoogleDriveSyncModal } from "./google-drive-sync-modal";
import { ApiClient } from "@/lib/api-client";

interface ResourcesHeaderProps {
  onResourcesUpdate?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export function ResourcesHeader({ onResourcesUpdate, searchQuery = "", onSearchChange }: ResourcesHeaderProps) {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [resyncing, setResyncing] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [registeringWebhook, setRegisteringWebhook] = useState(false);

  // Check webhook status on component mount
  useEffect(() => {
    checkWebhookStatus();
  }, []);

  const checkWebhookStatus = async () => {
    try {
      const response = await ApiClient.get('/api/google/webhook/status');
      if (response.ok) {
        const data = await response.json();
        setAutoSyncEnabled(data.active || false);
      }
    } catch (error) {
      console.error('Error checking webhook status:', error);
    }
  };

  const toggleAutoSync = async () => {
    if (autoSyncEnabled) {
      // Disable auto-sync (would need an endpoint to stop webhooks)
      alert('Auto-sync disable functionality needs to be implemented');
    } else {
      // Enable auto-sync by registering webhook
      setRegisteringWebhook(true);
      try {
        const response = await ApiClient.post('/api/google/webhook/register');

        if (!response.ok) {
          throw new Error('Failed to register webhook');
        }

        await response.json();
        setAutoSyncEnabled(true);
        alert(`Auto-sync enabled! Files will now sync automatically when changed in Google Drive.`);
      } catch (error) {
        console.error('Webhook registration error:', error);
        alert('Failed to enable auto-sync. Please try again.');
      } finally {
        setRegisteringWebhook(false);
      }
    }
  };

  const handleUploadComplete = () => {
    // Trigger a refresh of the resources list
    if (onResourcesUpdate) {
      onResourcesUpdate();
    }
  };

  const handleReSync = async () => {
    setResyncing(true);
    try {
      const response = await ApiClient.post('/api/google/sync/re-sync');

      if (!response.ok) {
        throw new Error('Re-sync failed');
      }

      const result = await response.json();
      
      // Show success message
      alert(result.message || `Re-sync completed: ${result.updatedCount} updated, ${result.syncedCount} checked`);
      
      // Refresh the resources list
      if (onResourcesUpdate) {
        onResourcesUpdate();
      }
    } catch (error) {
      console.error('Re-sync error:', error);
      alert('Failed to re-sync Google Drive files. Please try again.');
    } finally {
      setResyncing(false);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Resources</h1>
            <p className="text-muted-foreground mt-2">Internal knowledge base and resource library</p>
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
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleReSync}
              disabled={resyncing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${resyncing ? 'animate-spin' : ''}`} />
              {resyncing ? 'Re-syncing...' : 'Re-sync Drive'}
            </Button>
            <Button 
              variant={autoSyncEnabled ? "default" : "outline"}
              size="sm" 
              onClick={toggleAutoSync}
              disabled={registeringWebhook}
            >
              {registeringWebhook ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : autoSyncEnabled ? (
                <Zap className="h-4 w-4 mr-2" />
              ) : (
                <ZapOff className="h-4 w-4 mr-2" />
              )}
              {registeringWebhook ? 'Enabling...' : autoSyncEnabled ? 'Auto-sync ON' : 'Enable Auto-sync'}
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
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
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
