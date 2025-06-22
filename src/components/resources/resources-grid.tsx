"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, Eye, Video, Image, File, Loader2, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Resource {
  id: string;
  name: string;
  type: 'document' | 'video' | 'image' | 'other';
  category: string;
  department: string;
  description: string;
  s3_key: string;
  file_url: string;
  size: string;
  tags: string[];
  upload_date: string;
  uploaded_by: string;
  created_at?: string;
  download_url?: string;
}

const getFileIcon = (type: string) => {
  switch (type) {
    case "video":
      return Video;
    case "image":
      return Image;
    case "document":
      return FileText;
    default:
      return File;
  }
};

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    Sales: "bg-blue-100 text-blue-800",
    Demo: "bg-purple-100 text-purple-800",
    Process: "bg-green-100 text-green-800",
    Brand: "bg-pink-100 text-pink-800",
    Templates: "bg-yellow-100 text-yellow-800",
    Technical: "bg-gray-100 text-gray-800",
  };
  return colors[category] || "bg-gray-100 text-gray-800";
};

export function ResourcesGrid() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchResources = async () => {
    try {
      const response = await fetch("/api/resources");
      if (!response.ok) throw new Error("Failed to fetch resources");
      const data = await response.json();
      setResources(data);
    } catch (error) {
      console.error("Error fetching resources:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const handleView = (resource: Resource) => {
    if (resource.file_url) {
      window.open(resource.file_url, "_blank");
    }
  };

  const handleDownload = async (resource: Resource) => {
    if (resource.download_url) {
      try {
        const response = await fetch(resource.download_url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = resource.name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (error) {
        console.error("Download error:", error);
        alert("Failed to download file");
      }
    }
  };

  const handleDelete = async (resourceId: string) => {
    if (!confirm("Are you sure you want to delete this resource?")) return;

    setDeletingId(resourceId);
    try {
      const response = await fetch(`/api/resources?id=${resourceId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) throw new Error("Failed to delete resource");
      
      // Remove from local state
      setResources(resources.filter(r => r.id !== resourceId));
    } catch (error) {
      console.error("Error deleting resource:", error);
      alert("Failed to delete resource");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (resources.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No resources uploaded yet.</p>
        <p className="text-sm text-gray-400 mt-2">Click "Upload Resource" to add your first resource.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {resources.map((resource) => {
        const FileIcon = getFileIcon(resource.type);
        
        return (
          <Card key={resource.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <FileIcon className="h-5 w-5 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm font-medium truncate">{resource.name}</CardTitle>
                    <p className="text-xs text-gray-500 mt-1">{resource.size}</p>
                  </div>
                </div>
                <Badge className={getCategoryColor(resource.category)}>
                  {resource.category}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-gray-600 line-clamp-2">{resource.description}</p>
                
                <div className="flex flex-wrap gap-1">
                  {resource.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{resource.department}</span>
                  <span>
                    {formatDistanceToNow(new Date(resource.upload_date), { addSuffix: true })}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleView(resource)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleDownload(resource)}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(resource.id)}
                    disabled={deletingId === resource.id}
                  >
                    {deletingId === resource.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}