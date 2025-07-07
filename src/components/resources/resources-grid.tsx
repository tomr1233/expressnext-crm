import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  FileText, 
  Download, 
  Eye, 
  Video, 
  Image, 
  File, 
  Loader2, 
  Trash2, 
  Maximize2,
  RefreshCw,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

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
  // Add the new sync-related fields
  google_drive_id?: string;
  sync_status?: 'synced' | 'pending' | 'error' | 'deleted';
  last_synced_at?: string;
  google_modified_time?: string;
  version?: number;
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
    Sales: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
    Demo: "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400",
    Process: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
    Brand: "bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400",
    Templates: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
    Technical: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400",
  };
  return colors[category] || "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
};

// Component to display thumbnails with loading states
function ResourceThumbnail({ resource, onClick }: { resource: Resource; onClick: () => void }) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const FileIcon = getFileIcon(resource.type);

  // Function to get optimized thumbnail URL
  const getThumbnailSrc = () => {
    if (resource.type !== 'image') return null;
    
    // If you're using a proxy service like wsrv.nl (free)
    const thumbnailUrl = `https://wsrv.nl/?url=${encodeURIComponent(resource.file_url)}&w=300&h=300&fit=cover&q=80`;
    return thumbnailUrl;
  };

  if (resource.type === 'image' && !imageError) {
    const thumbnailSrc = getThumbnailSrc();
    
    return (
      <div 
        className="relative h-32 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden cursor-pointer group"
        onClick={onClick}
      >
        {imageLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        )}
        <img
          src={thumbnailSrc || resource.file_url}
          alt={resource.name}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-200",
            imageLoading ? "opacity-0" : "opacity-100"
          )}
          loading="lazy"
          onLoad={() => setImageLoading(false)}
          onError={(e) => {
            // If thumbnail fails, try original
            if (thumbnailSrc && e.currentTarget.src === thumbnailSrc) {
              e.currentTarget.src = resource.file_url;
            } else {
              setImageError(true);
              setImageLoading(false);
            }
          }}
        />
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
          <Maximize2 className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    );
  }

  if (resource.type === 'video') {
    return (
      <div 
        className="relative h-32 bg-gray-900 dark:bg-gray-800 rounded-lg overflow-hidden cursor-pointer group"
        onClick={onClick}
      >
        <div className="w-full h-full flex items-center justify-center">
          <Video className="h-12 w-12 text-gray-400 dark:text-gray-500" />
        </div>
        <div className="absolute bottom-2 left-2 right-2">
          <div className="text-xs text-white bg-black bg-opacity-60 px-2 py-1 rounded truncate">
            {resource.name}
          </div>
        </div>
      </div>
    );
  }

  // Default thumbnail for other file types
  return (
    <div 
      className="relative h-32 bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden cursor-pointer group"
      onClick={onClick}
    >
      <div className="w-full h-full flex flex-col items-center justify-center p-4">
        <FileIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mb-2" />
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center truncate max-w-full">
          {resource.name.split('.').pop()?.toUpperCase() || 'FILE'}
        </div>
      </div>
    </div>
  );
}

// Component to display file preview
function FilePreview({ resource }: { resource: Resource; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const renderPreview = () => {
    if (resource.type === 'image') {
      return (
        <div className="relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
          <img
            src={resource.file_url}
            alt={resource.name}
            className="max-w-full max-h-[70vh] object-contain mx-auto"
            onLoad={() => setLoading(false)}
            onError={() => setError(true)}
          />
          {loading && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400 dark:text-gray-500" />
            </div>
          )}
        </div>
      );
    }

    if (resource.type === 'video') {
      return (
        <video
          controls
          className="w-full max-h-[70vh] rounded-lg"
          onLoadedData={() => setLoading(false)}
          onError={() => setError(true)}
        >
          <source src={resource.file_url} type="video/mp4" />
          <source src={resource.file_url} type="video/webm" />
          Your browser does not support the video tag.
        </video>
      );
    }

    if (resource.type === 'document' && resource.file_url.toLowerCase().endsWith('.pdf')) {
      return (
        <iframe
          src={resource.file_url}
          className="w-full h-[70vh] rounded-lg border-0"
          onLoad={() => setLoading(false)}
          onError={() => setError(true)}
        />
      );
    }

    // For other document types, show a preview with option to open externally
    return (
      <div className="text-center py-12">
        <FileText className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <p className="text-muted-foreground mb-4">
          This file type cannot be previewed inline.
        </p>
        <Button onClick={() => window.open(resource.file_url, '_blank')}>
          Open in New Tab
        </Button>
      </div>
    );
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Failed to load preview</p>
        <Button variant="outline" onClick={() => window.open(resource.file_url, '_blank')}>
          Open in New Tab
        </Button>
      </div>
    );
  }

  return renderPreview();
}

export function ResourcesGrid() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewResource, setPreviewResource] = useState<Resource | null>(null);

  const fetchResources = async () => {
    try {
      const response = await fetch("/api/resources");
      if (!response.ok) throw new Error("Failed to fetch resources");
      const data = await response.json();
      // Since files are now publicly accessible, we can use file_url directly
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
    // For inline viewable types, open preview modal
    if (['image', 'video', 'document'].includes(resource.type)) {
      setPreviewResource(resource);
    } else {
      // For other types, open in new tab
      window.open(resource.file_url, "_blank");
    }
  };

  const handleDownload = async (resource: Resource) => {
    try {
      // Use the public URL directly for download
      const response = await fetch(resource.file_url);
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
        <Loader2 className="h-8 w-8 animate-spin text-gray-400 dark:text-gray-500" />
      </div>
    );
  }

  if (resources.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No resources uploaded yet.</p>
        <p className="text-sm text-muted-foreground/80 mt-2">Click &quot;Upload Resource&quot; or &quot;Google Drive Sync&quot; to add your first resource.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {resources.map((resource) => {
          const FileIcon = getFileIcon(resource.type);
          
          return (
            <Card key={resource.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <FileIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm font-medium truncate">{resource.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">{resource.size}</p>
                    </div>
                  </div>
                  <Badge className={getCategoryColor(resource.category)}>
                    {resource.category}
                  </Badge>
                </div>
                
                {/* Sync Status Indicators */}
                {resource.sync_status === 'pending' && (
                  <div className="flex items-center text-yellow-600 dark:text-yellow-400 text-xs mt-2">
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Syncing...
                  </div>
                )}

                {resource.sync_status === 'error' && (
                  <div className="flex items-center text-red-600 dark:text-red-400 text-xs mt-2">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Sync error
                  </div>
                )}

                {resource.google_drive_id && resource.sync_status === 'synced' && resource.last_synced_at && (
                  <div className="flex items-center text-green-600 dark:text-green-400 text-xs mt-2">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Synced {formatDistanceToNow(new Date(resource.last_synced_at), { addSuffix: true })}
                  </div>
                )}
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  {/* Thumbnail preview */}
                  <ResourceThumbnail 
                    resource={resource} 
                    onClick={() => handleView(resource)} 
                  />

                  <p className="text-sm text-muted-foreground line-clamp-2">{resource.description}</p>
                  
                  <div className="flex flex-wrap gap-1">
                    {resource.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
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

      {/* Preview Modal */}
      <Dialog open={!!previewResource} onOpenChange={(open) => !open && setPreviewResource(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="truncate pr-4">{previewResource?.name}</span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => previewResource && window.open(previewResource.file_url, '_blank')}
                >
                  <Maximize2 className="h-4 w-4 mr-1" />
                  Full Screen
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => previewResource && handleDownload(previewResource)}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          {previewResource && (
            <FilePreview 
              resource={previewResource} 
              onClose={() => setPreviewResource(null)} 
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}