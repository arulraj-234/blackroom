import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const MAX_IMAGE_SIZE = 1920; // max dimension in pixels
const JPEG_QUALITY = 0.85;

function compressImage(file) {
  return new Promise((resolve) => {
    // If file is small enough or not an image, skip compression
    if (file.size < 500000 || !file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      let { width, height } = img;

      // Scale down if too large
      if (width > MAX_IMAGE_SIZE || height > MAX_IMAGE_SIZE) {
        const ratio = Math.min(MAX_IMAGE_SIZE / width, MAX_IMAGE_SIZE / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        },
        'image/jpeg',
        JPEG_QUALITY
      );
    };

    img.src = URL.createObjectURL(file);
  });
}

function getMediaType(file) {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'file';
}

function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : 
    'xxxx-xxxx-xxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
}

export function useMediaUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const upload = useCallback(async (file, conversationId) => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const mediaType = getMediaType(file);
      let fileToUpload = file;

      // Compress images before upload
      if (mediaType === 'image') {
        setProgress(10);
        fileToUpload = await compressImage(file);
      }

      // Check file size (50MB limit for videos, 10MB for images, 20MB for audio)
      const limits = { image: 10485760, video: 52428800, audio: 20971520, file: 52428800 };
      if (fileToUpload.size > (limits[mediaType] || 52428800)) {
        throw new Error(`File too large. Max size: ${Math.round((limits[mediaType] || 52428800) / 1048576)}MB`);
      }

      setProgress(20);

      const ext = file.name.split('.').pop() || 'bin';
      const path = `${conversationId}/${generateId()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(path, fileToUpload, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setProgress(90);

      const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(path);

      setProgress(100);

      // Build metadata
      const metadata = {
        originalName: file.name,
        size: fileToUpload.size,
        mimeType: fileToUpload.type,
      };

      // Get image dimensions if applicable
      if (mediaType === 'image') {
        const dims = await getImageDimensions(fileToUpload);
        metadata.width = dims.width;
        metadata.height = dims.height;
      }

      return {
        url: urlData.publicUrl,
        mediaType,
        metadata,
      };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setUploading(false);
    }
  }, []);

  return { upload, uploading, progress, error };
}

function getImageDimensions(file) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = URL.createObjectURL(file);
  });
}
