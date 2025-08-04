// src/components/resources/google-drive-sync-modal.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ConnectGoogleDrive } from "./connect-google-drive";
import { 
  FileIcon, 
  Video, 
  Image, 
  FileText, 
  Loader2, 
  FolderIcon,
  ChevronLeft,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Search
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ApiClient } from "@/lib/api-client";

interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  type: 'document' | 'video' | 'image' | 'other';
  size: string;
  sizeBytes: number;
  createdTime: string;
  modifiedTime: string;
  webViewLink: string;
  parents?: string[];
}

interface GoogleDriveFolder {
  id: string;
  name: string;
  parents?: string[];
}

interface GoogleDriveSyncModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSyncComplete: () => void;
}

export function GoogleDriveSyncModal({ open, onOpenChange, onSyncComplete }: GoogleDriveSyncModalProps) {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [folders, setFolders] = useState<GoogleDriveFolder[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: "My Drive" }
  ]);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    syncedCount: number;
    errorCount: number;
    errors?: Array<{ file: string; error: string }>;
  } | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // Sync settings
  const [category, setCategory] = useState("");
  const [department, setDepartment] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (open) {
      loadFiles();
      loadFolders();
    }
  }, [open, currentFolderId, loadFiles, loadFolders]);

// Update the loadFiles function to use the correct endpoint
const loadFiles = useCallback(async () => {
  setLoading(true);
  setNeedsAuth(false);
  try {
    const url = currentFolderId 
      ? `/api/google/files?folderId=${currentFolderId}`
      : '/api/google/files';
    
    const response = await ApiClient.get(url);
    if (!response.ok) {
      if (response.status === 401) {
        setNeedsAuth(true);
        return;
      }
      throw new Error('Failed to load files');
    }
    
    const data = await response.json();
    setFiles(data.files);
  } catch (error) {
    console.error('Error loading files:', error);
    alert('Failed to load files from Google Drive');
  } finally {
    setLoading(false);
  }
}, [currentFolderId]);

const loadFolders = useCallback(async () => {
  try {
    const response = await ApiClient.get('/api/google/folders');
    if (response.ok) {
      const data = await response.json();
      setFolders(data.folders);
    }
  } catch (error) {
    console.error('Error loading folders:', error);
  }
}, []);

useEffect(() => {
  if (open) {
    loadFiles();
    loadFolders();
  }
}, [open, loadFiles, loadFolders]);

  const getFileIcon = (type: string) => {
    switch (type) {
      case "video": return Video;
      case "image": return Image;
      case "document": return FileText;
      default: return FileIcon;
    }
  };

  const handleSelectAll = () => {
    if (selectedFiles.size === filteredFiles.length && filteredFiles.length > 0) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(filteredFiles.map(f => f.id)));
    }
  };

  const handleFileSelect = (fileId: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const navigateToFolder = (folderId: string | null, folderName: string) => {
    setCurrentFolderId(folderId);
    setSearchQuery(""); // Clear search when navigating
    const currentIndex = folderPath.findIndex(f => f.id === folderId);
    
    if (currentIndex !== -1) {
      // Going back to a previous folder
      setFolderPath(folderPath.slice(0, currentIndex + 1));
    } else {
      // Going into a new folder
      setFolderPath([...folderPath, { id: folderId, name: folderName }]);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSync = async () => {
    if (selectedFiles.size === 0) {
      alert("Please select at least one file to sync");
      return;
    }

    if (!category || !department) {
      alert("Please select category and department");
      return;
    }

    setSyncing(true);
    setSyncResult(null);

    try {
      const selectedFileData = files.filter(f => selectedFiles.has(f.id));
      
      const response = await ApiClient.post('/api/google/sync', {
        files: selectedFileData,
        category,
        department,
        tags
      });

      if (!response.ok) {
        throw new Error('Sync failed');
      }

      const result = await response.json();
      setSyncResult(result);
      
      if (result.syncedCount > 0) {
        setTimeout(() => {
          onSyncComplete();
          onOpenChange(false);
          // Reset state
          setSelectedFiles(new Set());
          setSyncResult(null);
        }, 2000);
      }
    } catch (error) {
      console.error('Sync error:', error);
      alert('Failed to sync files. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  const currentFolders = folders.filter(f => 
    (currentFolderId === null && !f.parents) || 
    (f.parents && f.parents.includes(currentFolderId || ''))
  );

  // Filter files and folders based on search query
  const filteredFiles = searchQuery 
    ? files.filter(file => 
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : files;
  
  const filteredFolders = searchQuery
    ? currentFolders.filter(folder =>
        folder.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : currentFolders;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Sync Files from Google Drive</DialogTitle>
        </DialogHeader>

        {syncResult ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-4">
              {syncResult.success ? (
                <>
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                  <h3 className="text-lg font-semibold">Sync Complete!</h3>
                  <p className="text-gray-600">
                    Successfully synced {syncResult.syncedCount} file{syncResult.syncedCount !== 1 ? 's' : ''}
                  </p>
                  {syncResult.errorCount > 0 && (
                    <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        {syncResult.errorCount} file{syncResult.errorCount !== 1 ? 's' : ''} failed to sync
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <AlertCircle className="h-16 w-16 text-red-500 mx-auto" />
                  <h3 className="text-lg font-semibold">Sync Failed</h3>
                  <p className="text-gray-600">Failed to sync files. Please try again.</p>
                </>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Folder Navigation */}
            <div className="flex flex-col space-y-3 pb-3 border-b">
              {/* Breadcrumb Navigation */}
              <div className="flex items-center space-x-2">
                {folderPath.map((folder, index) => (
                  <div key={folder.id || 'root'} className="flex items-center">
                    {index > 0 && <span className="mx-2 text-gray-400">/</span>}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigateToFolder(folder.id, folder.name)}
                      className="text-sm"
                    >
                      {index === 0 && <FolderIcon className="h-4 w-4 mr-1" />}
                      {folder.name}
                    </Button>
                  </div>
                ))}
                <div className="flex-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadFiles}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search files and folders..."
                  className="pl-10"
                />
              </div>
            </div>

            {/* File List */}
            <div className="flex-1 overflow-y-auto min-h-[300px]">
            {loading ? (
                <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400 dark:text-gray-500" />
                </div>
                ) : needsAuth ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4 p-8">
                    <p className="text-center text-gray-600">
                    You need to connect your Google Drive account to access your files.
                    </p>
                    <ConnectGoogleDrive />
                </div>
                ) : (
                    <div className="space-y-2 p-4">
                    {/* Select All */}
                    {filteredFiles.length > 0 && (
                    <div className="flex items-center space-x-2 pb-2 border-b">
                        <Checkbox
                        checked={selectedFiles.size === filteredFiles.length && filteredFiles.length > 0}
                        onCheckedChange={handleSelectAll}
                        />
                        <Label className="text-sm font-medium">
                        Select All ({selectedFiles.size} selected)
                        </Label>
                    </div>
                )}

                  {/* Search Results Info */}
                  {searchQuery && (
                    <div className="text-sm text-gray-500 pb-2">
                      Found {filteredFiles.length} file{filteredFiles.length !== 1 ? 's' : ''} 
                      {filteredFolders.length > 0 && ` and ${filteredFolders.length} folder${filteredFolders.length !== 1 ? 's' : ''}`}
                    </div>
                  )}

                  {/* Folders */}
                  {filteredFolders.map(folder => (
                    <div
                      key={folder.id}
                      className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                      onClick={() => navigateToFolder(folder.id, folder.name)}
                    >
                      <FolderIcon className="h-5 w-5 text-blue-500" />
                      <span className="flex-1 font-medium">{folder.name}</span>
                      <ChevronLeft className="h-4 w-4 text-gray-400 rotate-180" />
                    </div>
                  ))}

                  {/* Files */}
                  {filteredFiles.map(file => {
                    const FileIcon = getFileIcon(file.type);
                    return (
                      <div
                        key={file.id}
                        className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg"
                      >
                        <Checkbox
                          checked={selectedFiles.has(file.id)}
                          onCheckedChange={() => handleFileSelect(file.id)}
                        />
                        <FileIcon className="h-5 w-5 text-gray-500" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {file.size} • Modified {formatDistanceToNow(new Date(file.modifiedTime), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    );
                  })}

                  {filteredFiles.length === 0 && filteredFolders.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      {searchQuery 
                        ? `No files or folders found matching "${searchQuery}"`
                        : "No files or folders in this location"
                      }
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sync Settings */}
            {selectedFiles.size > 0 && (
              <div className="border-t pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Category *</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sales">Sales</SelectItem>
                        <SelectItem value="Demo">Demo</SelectItem>
                        <SelectItem value="Process">Process</SelectItem>
                        <SelectItem value="Brand">Brand</SelectItem>
                        <SelectItem value="Templates">Templates</SelectItem>
                        <SelectItem value="Technical">Technical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Department *</Label>
                    <Select value={department} onValueChange={setDepartment}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sales">Sales</SelectItem>
                        <SelectItem value="Marketing">Marketing</SelectItem>
                        <SelectItem value="Operations">Operations</SelectItem>
                        <SelectItem value="Engineering">Engineering</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <Label>Tags</Label>
                  <div className="mt-1 flex items-center space-x-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="Add a tag"
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                    />
                    <Button type="button" variant="outline" onClick={addTag}>
                      Add
                    </Button>
                  </div>
                  {tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                          <button
                            onClick={() => removeTag(tag)}
                            className="ml-1 hover:text-red-500"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={syncing}>
                Cancel
              </Button>
              <Button 
                onClick={handleSync} 
                disabled={syncing || selectedFiles.size === 0 || !category || !department}
              >
                {syncing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  `Sync ${selectedFiles.size} File${selectedFiles.size !== 1 ? 's' : ''}`
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}