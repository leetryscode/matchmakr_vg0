'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { PlusIcon, ChevronLeftIcon, ChevronRightIcon, EllipsisVerticalIcon } from '@heroicons/react/24/solid';
import ImageCropper from './ImageCropper';
import { Area } from 'react-easy-crop';

// Helper function to create a cropped image
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new window.Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous'); // Needed for cross-origin images
    image.src = url;
  });

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area
): Promise<Blob | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }

  // set canvas size to match the bounding box
  canvas.width = image.width;
  canvas.height = image.height;

  // draw rotated image
  ctx.drawImage(image, 0, 0);

  // croppedAreaPixels values are bounding box with respect to the source image
  const data = ctx.getImageData(
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height
  );

  // set canvas width to final desired crop size - this will clear existing context
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // paste generated rotate image with correct offsets
  ctx.putImageData(data, 0, 0);

  // As a blob
  return new Promise((resolve) => {
    canvas.toBlob((file) => {
      resolve(file);
    }, 'image/jpeg');
  });
}

interface PhotoGalleryProps {
    userId: string;
    photos: (string | null)[] | null;
    userType?: 'SINGLE' | 'MATCHMAKR' | 'VENDOR';
}

const MAX_PHOTOS_SINGLE = 6;
const MAX_PHOTOS_MATCHMAKR = 1;
const ADD_PHOTO_SLOT = 'ADD_PHOTO_SLOT';

export default function PhotoGallery({ userId, photos: initialPhotos, userType = 'SINGLE' }: PhotoGalleryProps) {
    const supabase = createClient();
    const router = useRouter();
    const [photos, setPhotos] = useState(initialPhotos?.filter((p): p is string => typeof p === 'string' && p.trim() !== '') || []);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const [editingPhotoUrl, setEditingPhotoUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Determine max photos based on user type
    const maxPhotos = userType === 'MATCHMAKR' ? MAX_PHOTOS_MATCHMAKR : MAX_PHOTOS_SINGLE;
    const isMatchMakr = userType === 'MATCHMAKR';

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [menuRef]);

    const displayItems = useMemo(() => {
        const items = [...photos];
        if (photos.length < maxPhotos) {
            items.push(ADD_PHOTO_SLOT);
        }
        return items;
    }, [photos, maxPhotos]);

    const handleNavigation = (direction: 'next' | 'prev') => {
        const newIndex = direction === 'next'
            ? (currentIndex + 1) % displayItems.length
            : (currentIndex - 1 + displayItems.length) % displayItems.length;
        setCurrentIndex(newIndex);
    };

    const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // For MatchMakrs, if they already have a photo, replace it instead of adding
        if (isMatchMakr && photos.length > 0) {
            setEditingPhotoUrl(photos[0]);
        }

        const reader = new FileReader();
        reader.onload = () => {
            setImageToCrop(reader.result as string);
        };
        reader.readAsDataURL(file);
        
        // Reset file input to allow re-uploading the same file
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleEditClick = (photoUrl: string) => {
        setEditingPhotoUrl(photoUrl);
        setImageToCrop(photoUrl);
        setIsMenuOpen(false);
    }
    
    const onCropComplete = async (croppedAreaPixels: Area) => {
        if (!imageToCrop) return;

        setUploading(true);
        setImageToCrop(null); // Close cropper

        try {
            const croppedImageBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);
            if (!croppedImageBlob) {
                throw new Error('Could not crop image.');
            }
            
            const fileExt = 'jpeg';
            const fileName = `${Date.now()}.${fileExt}`;
            const filePath = `${userId}/${fileName}`;

            // If we were editing, delete the old photo first
            if (editingPhotoUrl) {
                const oldFileName = editingPhotoUrl.split('/').pop();
                if (oldFileName) {
                     await supabase.storage.from('profile_pictures').remove([`${userId}/${oldFileName}`]);
                }
            }

            const { error: uploadError } = await supabase.storage.from('profile_pictures').upload(filePath, croppedImageBlob, {
                contentType: 'image/jpeg',
                upsert: false,
            });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('profile_pictures').getPublicUrl(filePath);
            
            let updatedPhotos: string[];
            if (editingPhotoUrl) {
                // Replace the old URL with the new one
                updatedPhotos = photos.map(p => p === editingPhotoUrl ? publicUrl : p);
            } else {
                // Add the new URL
                updatedPhotos = [...photos, publicUrl];
            }
            
            const { error: dbError } = await supabase.from('profiles').update({ photos: updatedPhotos }).eq('id', userId);
            if (dbError) {
                console.error('Database update error:', dbError);
                console.error('Attempting to update profile ID:', userId);
                console.error('Current user context:', await supabase.auth.getUser());
                throw dbError;
            }

            setPhotos(updatedPhotos);
            setEditingPhotoUrl(null);
            setCurrentIndex(updatedPhotos.findIndex(p => p === publicUrl));

        } catch (error: any) {
            alert(error.message);
        } finally {
            setUploading(false);
        }
    };
    
    const handlePhotoDelete = async (photoUrlToDelete: string) => {
        if (!window.confirm('Are you sure you want to delete this photo?')) return;

        try {
            const updatedPhotos = photos.filter(p => p !== photoUrlToDelete);
            
            // Update database first
            const { error: dbError } = await supabase.from('profiles').update({ photos: updatedPhotos }).eq('id', userId);
            if (dbError) {
                console.error('Database delete error:', dbError);
                console.error('Attempting to update profile ID:', userId);
                console.error('Current user context:', await supabase.auth.getUser());
                throw dbError;
            }

            // Delete from storage
            const fileName = photoUrlToDelete.split('/').pop();
            if(fileName) {
                const { error: storageError } = await supabase.storage.from('profile_pictures').remove([`${userId}/${fileName}`]);
                if (storageError) {
                    console.error("Storage Error:", storageError);
                }
            }
            
            setPhotos(updatedPhotos);
            
            // Adjust index
            if (currentIndex >= updatedPhotos.length) {
                setCurrentIndex(Math.max(0, updatedPhotos.length -1));
            }
            router.refresh();

        } catch (error: any) {
            alert(error.message);
        }
    };

    const currentItem = displayItems[currentIndex];

    return (
        <div className="w-full">
            <div className="relative w-full aspect-square bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center">
                {currentItem === ADD_PHOTO_SLOT ? (
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col items-center justify-center w-full h-full bg-gray-100 hover:bg-gray-200 transition-colors"
                        disabled={uploading}
                    >
                        {uploading ? (
                            <div className="w-12 h-12 border-4 border-t-pink-500 rounded-full animate-spin" />
                        ) : (
                            <>
                                <PlusIcon className="h-16 w-16 text-gray-400" />
                                <span className="mt-2 text-sm font-semibold text-gray-600">
                                    {isMatchMakr ? 'Add Profile Photo' : 'Add Photo'}
                                </span>
                                {isMatchMakr && (
                                    <span className="mt-1 text-xs text-gray-500">MatchMakrs can have 1 photo</span>
                                )}
                            </>
                        )}
                    </button>
                ) : (
                    <>
                    <Image
                        src={currentItem}
                        alt={`Profile photo ${currentIndex + 1}`}
                        fill
                        sizes="100vw"
                        objectFit="cover"
                        priority
                    />
                    </>
                )}

                {/* Navigation and Action Buttons */}
                {currentItem !== ADD_PHOTO_SLOT ? (
                    <>
                        <div ref={menuRef} className="absolute top-4 left-4 z-20">
                            <button onClick={() => setIsMenuOpen(prev => !prev)} className="bg-black/30 text-white p-2 rounded-full hover:bg-black/50">
                                <EllipsisVerticalIcon className="h-6 w-6" />
                            </button>
                            {isMenuOpen && (
                                <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5">
                                    <div className="py-1">
                                        <button
                                            onClick={() => {
                                                handlePhotoDelete(currentItem);
                                                setIsMenuOpen(false);
                                            }}
                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        >
                                            Remove Photo
                                        </button>
                                        <button
                                            onClick={() => {
                                                handleEditClick(currentItem);
                                            }}
                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        >
                                            Edit Photo
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                         {displayItems.length > 1 && (
                            <>
                                <button onClick={() => handleNavigation('prev')} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 text-white p-2 rounded-full hover:bg-black/50 z-10">
                                    <ChevronLeftIcon className="h-6 w-6" />
                                </button>
                                <button onClick={() => handleNavigation('next')} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 text-white p-2 rounded-full hover:bg-black/50 z-10">
                                    <ChevronRightIcon className="h-6 w-6" />
                                </button>
                            </>
                        )}
                    </>
                ): (
                     displayItems.length > 1 && (
                            <>
                                <button onClick={() => handleNavigation('prev')} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 text-white p-2 rounded-full hover:bg-black/50 z-10">
                                    <ChevronLeftIcon className="h-6 w-6" />
                                </button>
                                <button onClick={() => handleNavigation('next')} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 text-white p-2 rounded-full hover:bg-black/50 z-10">
                                    <ChevronRightIcon className="h-6 w-6" />
                                </button>
                            </>
                        )
                )}
            </div>

            {imageToCrop && (
                <ImageCropper
                    image={imageToCrop}
                    onClose={() => setImageToCrop(null)}
                    onCropComplete={onCropComplete}
                />
            )}

            {/* Dots Indicator - Only show for singles with multiple photos */}
            {!isMatchMakr && displayItems.length > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                    {displayItems.map((_, index) => (
                        <button key={index} onClick={() => setCurrentIndex(index)} className="p-1">
                            <div className={`h-2 w-2 rounded-full ${currentIndex === index ? 'bg-pink-500' : 'bg-gray-300'}`} />
                        </button>
                    ))}
                </div>
            )}

            <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" accept="image/*" />
        </div>
    );
} 