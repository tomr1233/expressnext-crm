// src/components/resources/google-drive-sync-modal.tsx
"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  AlertCircle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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
  }, [open, currentFolderId]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const url = currentFolderId 
        ? `/api/google/sync?folderId=${currentFolderId}`
        : '/api/google/sync';
      
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 401) {
          // Not authenticated, need to connect Google Drive
          alert("Please connect your Google Drive account first");
          onOpenChange(false);
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
  };

  const loadFolders = async () => {
    try {
      const response = await fetch('/api/google/sync', { method: 'PUT' });
      if (response.ok) {
        const data = await response.json();
        setFolders(data.folders);
      }
    } catch (error) {
      console.error('Error loading folders:', error);
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case "video": return Video;
      case "image": return Image;
      case "document": return FileText;
      default: return FileIcon;
    }
  };

  const handleSelectAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map(f => f.id)));
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
      
      const response = await fetch('/api/google/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: selectedFileData,
          category,
          department,
          tags
        })
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
            <div className="flex items-center space-x-2 pb-3 border-b">
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

            {/* File List */}
            <div className="flex-1 overflow-y-auto min-h-[300px]">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="space-y-2 p-4">
                  {/* Select All */}
                  {files.length > 0 && (
                    <div className="flex items-center space-x-2 pb-2 border-b">
                      <Checkbox
                        checked={selectedFiles.size === files.length}
                        onCheckedChange={handleSelectAll}
                      />
                      <Label className="text-sm font-medium">
                        Select All ({selectedFiles.size} selected)
                      </Label>
                    </div>
                  )}

                  {/* Folders */}
                  {currentFolders.map(folder => (
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
                  {files.map(file => {
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

                  {files.length === 0 && currentFolders.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No files or folders in this location
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