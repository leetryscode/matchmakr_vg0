/**
 * DraftPhotoUpload
 *
 * Lightweight single-photo upload component for the draft profile walkthrough.
 * Uploads to the same profile_pictures storage bucket as PhotoGallery.
 * Does NOT write to any database table — calls onUploaded(url) and lets the
 * parent handle persistence (writes to invites.draft_photos).
 */

'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import ImageCropper from '@/components/profile/ImageCropper';
import type { Area } from 'react-easy-crop';

// ── Image processing (same logic as PhotoGallery) ──────────────────────────

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new window.Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', reject);
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob | null> {
  const image = await createImage(imageSrc);
  const cropX = Math.max(0, Math.round(pixelCrop.x));
  const cropY = Math.max(0, Math.round(pixelCrop.y));
  const cropW = Math.max(1, Math.round(pixelCrop.width));
  const cropH = Math.max(1, Math.round(pixelCrop.height));

  const cropCanvas = document.createElement('canvas');
  const cropCtx = cropCanvas.getContext('2d');
  if (!cropCtx) return null;
  cropCanvas.width = cropW;
  cropCanvas.height = cropH;
  cropCtx.drawImage(image, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

  const OUTPUT_SIZE = 1080;
  const outputCanvas = document.createElement('canvas');
  const outputCtx = outputCanvas.getContext('2d');
  if (!outputCtx) return null;
  outputCanvas.width = OUTPUT_SIZE;
  outputCanvas.height = OUTPUT_SIZE;
  outputCtx.imageSmoothingEnabled = true;
  outputCtx.imageSmoothingQuality = 'high';
  outputCtx.drawImage(
    cropCanvas,
    0, 0, cropCanvas.width, cropCanvas.height,
    0, 0, OUTPUT_SIZE, OUTPUT_SIZE,
  );

  return new Promise((resolve) => {
    outputCanvas.toBlob(
      (blob) => {
        cropCanvas.width = cropCanvas.height = 0;
        outputCanvas.width = outputCanvas.height = 0;
        resolve(blob);
      },
      'image/jpeg',
      0.85,
    );
  });
}

// ── Component ───────────────────────────────────────────────────────────────

interface DraftPhotoUploadProps {
  /** Supabase auth user id — used as the storage path prefix. */
  userId: string;
  /** Current draft photo URL (null if none uploaded yet). */
  currentPhotoUrl: string | null;
  /** Called with the public URL after a successful upload. */
  onUploaded: (url: string) => void;
}

export default function DraftPhotoUpload({
  userId,
  currentPhotoUrl,
  onUploaded,
}: DraftPhotoUploadProps) {
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const reader = new FileReader();
    reader.onload = () => setImageToCrop(reader.result as string);
    reader.readAsDataURL(file);
    // Reset so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onCropComplete = async (croppedAreaPixels: Area) => {
    if (!imageToCrop) return;
    setUploading(true);
    setImageToCrop(null);
    setError(null);

    try {
      const blob = await getCroppedImg(imageToCrop, croppedAreaPixels);
      if (!blob) throw new Error('Could not process image.');

      const filePath = `${userId}/${Date.now()}.jpeg`;
      const { error: uploadError } = await supabase.storage
        .from('profile_pictures')
        .upload(filePath, blob, { contentType: 'image/jpeg', upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile_pictures')
        .getPublicUrl(filePath);

      onUploaded(publicUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Preview */}
      {currentPhotoUrl ? (
        <div className="relative w-44 h-44 rounded-2xl overflow-hidden ring-2 ring-orbit-gold/30">
          <Image src={currentPhotoUrl} alt="Draft photo" fill className="object-cover" />
        </div>
      ) : (
        <div className="w-44 h-44 rounded-2xl bg-white/8 border border-white/15 flex items-center justify-center">
          <span className="text-white/35 text-sm">No photo yet</span>
        </div>
      )}

      {error && (
        <p className="text-sm text-orbit-warning text-center max-w-xs">{error}</p>
      )}

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="onboarding-btn-primary"
      >
        {uploading ? 'Uploading…' : currentPhotoUrl ? 'Change photo' : 'Choose photo'}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {imageToCrop && (
        <ImageCropper
          image={imageToCrop}
          onCropComplete={onCropComplete}
          onClose={() => setImageToCrop(null)}
        />
      )}
    </div>
  );
}
