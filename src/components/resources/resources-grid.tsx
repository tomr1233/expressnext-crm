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

// Component to display file type indicator
function FileTypeIndicator({ resource }: { resource: Resource }) {
  const FileIcon = getFileIcon(resource.type);
  const extension = resource.name.split('.').pop()?.toLowerCase();
  
  // Color coding for different document types
  const getTypeColor = (ext: string) => {
    switch (ext) {
      case 'pdf': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'doc':
      case 'docx': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'xls':
      case 'xlsx': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'ppt':
      case 'pptx': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'txt': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      case 'json': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'svg': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'mp4':
      case 'mov':
      case 'avi':
      case 'webm': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getFileTypeName = (ext: string) => {
    switch (ext) {
      case 'pdf': return 'PDF Document';
      case 'doc':
      case 'docx': return 'Word Document';
      case 'xls':
      case 'xlsx': return 'Excel Spreadsheet';
      case 'ppt':
      case 'pptx': return 'PowerPoint Presentation';
      case 'txt': return 'Text File';
      case 'json': return 'JSON File';
      case 'jpg':
      case 'jpeg': return 'JPEG Image';
      case 'png': return 'PNG Image';
      case 'gif': return 'GIF Image';
      case 'svg': return 'SVG Image';
      case 'mp4': return 'MP4 Video';
      case 'mov': return 'MOV Video';
      case 'avi': return 'AVI Video';
      case 'webm': return 'WebM Video';
      default: return 'File';
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <FileIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
      </div>
      <Badge className={cn("text-xs font-medium", getTypeColor(extension || ''))}>
        {extension?.toUpperCase() || 'FILE'}
      </Badge>
    </div>
  );
}

// Component to preview text-based files
function TextFilePreview({ fileUrl, onLoad, onError }: { fileUrl: string; onLoad: () => void; onError: () => void }) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error('Failed to fetch file');
        const text = await response.text();
        setContent(text);
        onLoad();
      } catch (error) {
        console.error('Error fetching text file:', error);
        onError();
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [fileUrl, onLoad, onError]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 h-[70vh] overflow-auto">
      <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono">
        {content}
      </pre>
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
            src={resource.download_url || resource.file_url}
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
          <source src={resource.download_url || resource.file_url} type="video/mp4" />
          <source src={resource.download_url || resource.file_url} type="video/webm" />
          Your browser does not support the video tag.
        </video>
      );
    }

    if (resource.type === 'document') {
      const resourceUrl = resource.download_url || resource.file_url;
      const fileUrl = resourceUrl.toLowerCase();
      
      // PDF files - direct iframe
      if (fileUrl.includes('.pdf')) {
        return (
          <iframe
            src={resourceUrl}
            className="w-full h-[70vh] rounded-lg border-0"
            onLoad={() => setLoading(false)}
            onError={() => setError(true)}
          />
        );
      }
      
      // Office documents - use Microsoft Office Online viewer
      if (fileUrl.includes('.docx') || fileUrl.includes('.doc') || 
          fileUrl.includes('.xlsx') || fileUrl.includes('.xls') || 
          fileUrl.includes('.pptx') || fileUrl.includes('.ppt')) {
        const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(resourceUrl)}`;
        return (
          <iframe
            src={viewerUrl}
            className="w-full h-[70vh] rounded-lg border-0"
            onLoad={() => setLoading(false)}
            onError={() => setError(true)}
          />
        );
      }
      
      // Text files - fetch and display content
      if (fileUrl.includes('.txt') || fileUrl.includes('.md') || 
          fileUrl.includes('.json') || fileUrl.includes('.csv') ||
          fileUrl.includes('.xml') || fileUrl.includes('.html')) {
        return <TextFilePreview fileUrl={resourceUrl} onLoad={() => setLoading(false)} onError={() => setError(true)} />;
      }
    }

    // For other document types, show a preview with option to open externally
    return (
      <div className="text-center py-12">
        <FileText className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <p className="text-muted-foreground mb-4">
          This file type cannot be previewed inline.
        </p>
        <Button onClick={() => window.open(resource.download_url || resource.file_url, '_blank')}>
          Open in New Tab
        </Button>
      </div>
    );
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Failed to load preview</p>
        <Button variant="outline" onClick={() => window.open(resource.download_url || resource.file_url, '_blank')}>
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
      window.open(resource.download_url || resource.file_url, "_blank");
    }
  };

  const handleDownload = async (resource: Resource) => {
    try {
      // Use the signed URL for download
      const downloadUrl = resource.download_url || resource.file_url;
      const response = await fetch(downloadUrl);
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
          return (
            <Card key={resource.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base font-medium truncate mb-2">{resource.name}</CardTitle>
                  </div>
                  <Badge className={getCategoryColor(resource.category)}>
                    {resource.category}
                  </Badge>
                </div>
                
                {/* Sync Status Indicators */}
                {resource.sync_status === 'pending' && (
                  <div className="flex items-center text-yellow-600 dark:text-yellow-400 text-xs mt-2">
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Syncing from Google Drive...
                  </div>
                )}

                {resource.sync_status === 'error' && (
                  <div className="flex items-center text-red-600 dark:text-red-400 text-xs mt-2">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Google Drive sync error
                  </div>
                )}

                {resource.google_drive_id && resource.sync_status === 'synced' && resource.last_synced_at && (
                  <div className="flex items-center text-green-600 dark:text-green-400 text-xs mt-2">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Synced from Google Drive {formatDistanceToNow(new Date(resource.last_synced_at), { addSuffix: true })}
                  </div>
                )}
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">{resource.description}</p>
                  
                  <div className="flex flex-wrap gap-1">
                    {resource.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
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
                  onClick={() => previewResource && window.open(previewResource.download_url || previewResource.file_url, '_blank')}
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