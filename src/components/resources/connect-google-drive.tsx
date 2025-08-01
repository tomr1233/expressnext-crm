// src/components/resources/connect-google-drive.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { ApiClient } from "@/lib/api-client";

export function ConnectGoogleDrive() {
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const response = await ApiClient.get("/api/google/auth");
      const data = await response.json();
      
      if (data.authUrl) {
        // Redirect to Google's auth page
        window.location.href = data.authUrl;
      } else {
        throw new Error("Failed to get auth URL");
      }
    } catch (error) {
      console.error("Error connecting to Google Drive:", error);
      alert("Failed to connect to Google Drive. Please try again.");
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleConnect} disabled={loading}>
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Connecting...
        </>
      ) : (
        "Connect Google Drive"
      )}
    </Button>
  );
}
