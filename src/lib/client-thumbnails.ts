// src/lib/client-thumbnails.ts

export interface ThumbnailOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  }
  
  /**
   * Generate a thumbnail from an image file on the client side
   */
  export async function generateImageThumbnail(
    file: File,
    options: ThumbnailOptions = {}
  ): Promise<Blob | null> {
    const { maxWidth = 300, maxHeight = 300, quality = 0.8 } = options;
  
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
          // Calculate new dimensions
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }
          
          // Create canvas
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }
          
          // Draw resized image
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to blob
          canvas.toBlob(
            (blob) => {
              resolve(blob);
            },
            'image/jpeg',
            quality
          );
        };
        
        img.onerror = () => {
          resolve(null);
        };
        
        img.src = e.target?.result as string;
      };
      
      reader.onerror = () => {
        resolve(null);
      };
      
      reader.readAsDataURL(file);
    });
  }
  
  /**
   * Generate a thumbnail from a video file on the client side
   */
  export async function generateVideoThumbnail(
    file: File,
    seekTime: number = 1.0
  ): Promise<Blob | null> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      
      video.onloadedmetadata = () => {
        video.currentTime = Math.min(seekTime, video.duration);
      };
      
      video.onseeked = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        
        ctx.drawImage(video, 0, 0);
        
        canvas.toBlob(
          (blob) => {
            resolve(blob);
            // Clean up
            URL.revokeObjectURL(video.src);
          },
          'image/jpeg',
          0.8
        );
      };
      
      video.onerror = () => {
        resolve(null);
        URL.revokeObjectURL(video.src);
      };
      
      video.src = URL.createObjectURL(file);
    });
  }
  
  /**
   * Check if a file type supports thumbnail generation
   */
  export function canGenerateThumbnail(file: File): boolean {
    const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const videoTypes = ['video/mp4', 'video/webm', 'video/ogg'];
    
    return imageTypes.includes(file.type) || videoTypes.includes(file.type);
  }
  
  /**
   * Convert a blob to base64 data URL
   */
  export function blobToDataURL(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }