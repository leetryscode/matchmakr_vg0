'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { PlusIcon, ChevronLeftIcon, ChevronRightIcon, EllipsisVerticalIcon } from '@heroicons/react/24/solid';
import ImageCropper from './ImageCropper';
import { Area } from 'react-easy-crop';
import 'keen-slider/keen-slider.min.css';
import { useKeenSlider } from 'keen-slider/react';

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

    const [sliderRef, instanceRef] = useKeenSlider<HTMLDivElement>({
        initial: 0,
        slideChanged(s) {
            setCurrentIndex(s.track.details.rel);
        },
        rubberband: false,
        loop: false,
        mode: 'snap',
    });

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
    const isCarousel = !isMatchMakr && photos.length > 1;

    return (
        <div className="relative mb-6 px-2 sm:px-0">
            <div className="relative w-full aspect-[4/5] bg-gray-200 rounded-2xl overflow-hidden flex items-center justify-center shadow-card mx-auto max-w-md mt-6">
                {isCarousel ? (
                    <div ref={sliderRef} className="keen-slider w-full h-full">
                        {photos.map((photo, idx) => (
                            <div className="keen-slider__slide flex items-center justify-center" key={idx}>
                                <Image
                                    src={photo}
                                    alt={`Profile photo ${idx + 1}`}
                                    fill
                                    sizes="100vw"
                                    className="object-cover rounded-2xl"
                                    priority={idx === 0}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        {photos[0] && (
                            <Image
                                src={photos[0]}
                                alt="Profile photo"
                                fill
                                sizes="100vw"
                                className="object-cover rounded-2xl"
                                priority
                            />
                        )}
                    </>
                )}
            </div>
            {/* Photo indicator dots for carousel only */}
            {isCarousel && (
                <div className="flex justify-center mt-2 gap-2">
                    {photos.map((_, idx) => (
                        <span
                            key={idx}
                            className={`inline-block w-2 h-2 rounded-full ${idx === currentIndex ? 'bg-accent-teal-light' : 'bg-gray-300'} transition-all`}
                        />
                    ))}
                </div>
            )}
            <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" accept="image/*" />
        </div>
    );
} 