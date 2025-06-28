"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, FileIcon, Image, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { generateImageThumbnail, generateVideoThumbnail, canGenerateThumbnail } from "@/lib/client-thumbnails";

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete: () => void;
}

export function UploadModal({ open, onOpenChange, onUploadComplete }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    department: "",
    description: "",
    tags: [] as string[],
  });
  const [tagInput, setTagInput] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Pre-fill name if empty
      if (!formData.name) {
        setFormData({ ...formData, name: selectedFile.name });
      }
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      });
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove),
    });
  };

  const getFileType = (file: File): string => {
    if (file.type.startsWith("video/")) return "video";
    if (file.type.startsWith("image/")) return "image";
    if (file.type.includes("pdf") || file.type.includes("document") || file.type.includes("text")) return "document";
    return "other";
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  const handleUpload = async () => {
    if (!file || !formData.name || !formData.category || !formData.department) {
      alert("Please fill in all required fields");
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      // Step 1: Get presigned URL
      const urlResponse = await fetch("/api/resources/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          fileSize: file.size,
        }),
      });

      if (!urlResponse.ok) {
        throw new Error("Failed to get upload URL");
      }

      const { uploadUrl, key, publicUrl } = await urlResponse.json();

      // Step 2: Upload file to S3
      setProgress(33);
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file");
      }

      // Step 3: Save metadata to database
      setProgress(66);
      const metadataResponse = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          type: getFileType(file),
          category: formData.category,
          department: formData.department,
          description: formData.description,
          s3_key: key,
          file_url: publicUrl,
          size: formatFileSize(file.size),
          tags: formData.tags,
        }),
      });

      if (!metadataResponse.ok) {
        throw new Error("Failed to save resource metadata");
      }

      setProgress(100);
      setTimeout(() => {
        onUploadComplete();
        onOpenChange(false);
        // Reset form
        setFile(null);
        setFormData({
          name: "",
          category: "",
          department: "",
          description: "",
          tags: [],
        });
        setProgress(0);
      }, 500);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload resource. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload New Resource</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload */}
          <div>
            <Label>File *</Label>
            {!file ? (
              <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <label className="mt-2 block cursor-pointer">
                  <span className="text-sm text-gray-600">
                    Click to upload or drag and drop
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            ) : (
              <div className="mt-2 flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileIcon className="h-8 w-8 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFile(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Name */}
          <div>
            <Label>Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter resource name"
              className="mt-2"
            />
          </div>

          {/* Category and Department */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="mt-2">
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
              <Select
                value={formData.department}
                onValueChange={(value) => setFormData({ ...formData, department: value })}
              >
                <SelectTrigger className="mt-2">
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

          {/* Description */}
          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter a brief description"
              className="mt-2"
              rows={3}
            />
          </div>

          {/* Tags */}
          <div>
            <Label>Tags</Label>
            <div className="mt-2 flex items-center space-x-2">
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
            {formData.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {formData.tags.map((tag) => (
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

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Uploading...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading || !file}>
              {uploading ? "Uploading..." : "Upload Resource"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}