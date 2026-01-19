'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { PlusIcon, EllipsisVerticalIcon } from '@heroicons/react/24/solid';
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
  
  // Ensure pixelCrop values are safe integers (react-easy-crop may return floats)
  const cropX = Math.max(0, Math.round(pixelCrop.x));
  const cropY = Math.max(0, Math.round(pixelCrop.y));
  const cropW = Math.max(1, Math.round(pixelCrop.width));
  const cropH = Math.max(1, Math.round(pixelCrop.height));
  
  // Step 1: Create intermediate canvas for the cropped region
  const cropCanvas = document.createElement('canvas');
  const cropCtx = cropCanvas.getContext('2d');

  if (!cropCtx) {
    return null;
  }

  // Set canvas size to match the crop dimensions
  cropCanvas.width = cropW;
  cropCanvas.height = cropH;

  // Draw the cropped region from the source image
  cropCtx.drawImage(
    image,
    cropX,
    cropY,
    cropW,
    cropH,
    0,
    0,
    cropW,
    cropH
  );

  // Step 2: Create destination canvas at fixed 1080x1080 resolution
  const OUTPUT_SIZE = 1080;
  const outputCanvas = document.createElement('canvas');
  const outputCtx = outputCanvas.getContext('2d');

  if (!outputCtx) {
    return null;
  }

  outputCanvas.width = OUTPUT_SIZE;
  outputCanvas.height = OUTPUT_SIZE;

  // Enable high-quality image smoothing for better scaling
  outputCtx.imageSmoothingEnabled = true;
  outputCtx.imageSmoothingQuality = 'high';

  // Step 3: Draw the cropped image scaled to 1080x1080 (maintains exact framing)
  outputCtx.drawImage(
    cropCanvas,
    0,
    0,
    cropCanvas.width,
    cropCanvas.height,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE
  );

  // Step 4: Export as JPEG with quality 0.85
  return new Promise((resolve) => {
    outputCanvas.toBlob(
      (file) => {
        // Memory cleanup: help GC by clearing canvas dimensions
        cropCanvas.width = cropCanvas.height = 0;
        outputCanvas.width = outputCanvas.height = 0;
        resolve(file);
      },
      'image/jpeg',
      0.85
    );
  });
}

interface PhotoGalleryProps {
    userId: string;
    photos: (string | null)[] | null;
    userType?: 'SINGLE' | 'MATCHMAKR' | 'VENDOR';
    canEdit?: boolean;
    profileName?: string | null;
    name?: string | null;
    age?: number | null;
    interests?: Array<{id: number, name: string}>;
}

const MAX_PHOTOS_SINGLE = 6;
const MAX_PHOTOS_MATCHMAKR = 1;
const MAX_PHOTOS_VENDOR = 6;
const ADD_PHOTO_SLOT = 'ADD_PHOTO_SLOT';

export default function PhotoGallery({ userId, photos: initialPhotos, userType = 'SINGLE', canEdit = true, profileName = null, name = null, age = null, interests = [] }: PhotoGalleryProps) {
    const supabase = createClient();
    const router = useRouter();
    const [photos, setPhotos] = useState(initialPhotos ? initialPhotos.filter((p): p is string => typeof p === 'string' && p.trim() !== '') : []);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [activeMenuPhotoUrl, setActiveMenuPhotoUrl] = useState<string | null>(null);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const [editingPhotoUrl, setEditingPhotoUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Determine max photos based on user type (must be before useEffect that uses it)
    const maxPhotos = userType === 'MATCHMAKR' ? MAX_PHOTOS_MATCHMAKR : 
                     userType === 'VENDOR' ? MAX_PHOTOS_VENDOR : MAX_PHOTOS_SINGLE;
    const isMatchMakr = userType === 'MATCHMAKR';
    const isVendor = userType === 'VENDOR';

    // Debug: Track canEdit changes (only log when it changes to help diagnose issues)
    useEffect(() => {
        if (canEdit === false) {
            console.log('PhotoGallery: canEdit is false', { 
                canEdit, 
                userType, 
                userId, 
                photosLength: photos.length,
                maxPhotos 
            });
        }
    }, [canEdit, userType, userId, photos.length, maxPhotos]);

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
                setActiveMenuPhotoUrl(null);
            }
        }
        if (activeMenuPhotoUrl) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => {
                document.removeEventListener("mousedown", handleClickOutside);
            };
        }
    }, [activeMenuPhotoUrl]);

    const displayItems = useMemo(() => {
        const items = [...photos];
        if (canEdit && photos.length < maxPhotos) {
            items.push(ADD_PHOTO_SLOT);
        }
        return items;
    }, [photos, maxPhotos, canEdit]);

    const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            console.warn('PhotoGallery: No file selected');
            return;
        }

        // For MatchMakrs, if they already have a photo, replace it instead of adding
        if (isMatchMakr && photos.length > 0) {
            setEditingPhotoUrl(photos[0]);
        }

        const reader = new FileReader();
        reader.onload = () => {
            setImageToCrop(reader.result as string);
        };
        reader.onerror = (error) => {
            console.error('PhotoGallery: FileReader error', error);
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
        setActiveMenuPhotoUrl(null);
    }
    
    const onCropComplete = async (croppedAreaPixels: Area) => {
        if (!imageToCrop) return;

        setUploading(true);
        setImageToCrop(null); // Close cropper

        // Capture old photo info BEFORE any state changes or uploads (for safe replacement)
        const isReplacing = !!editingPhotoUrl;
        const oldPhotoUrl = editingPhotoUrl || null;
        const oldFileName = oldPhotoUrl ? new URL(oldPhotoUrl).pathname.split('/').pop() : null;
        const oldFilePath = oldFileName ? `${userId}/${oldFileName}` : null;

        try {
            const croppedImageBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);
            if (!croppedImageBlob) {
                throw new Error('Could not crop image.');
            }
            
            const fileExt = 'jpeg';
            const fileName = `${Date.now()}.${fileExt}`;
            const filePath = `${userId}/${fileName}`;

            // Step 1: Upload new photo first (don't delete old one yet)
            const { error: uploadError } = await supabase.storage.from('profile_pictures').upload(filePath, croppedImageBlob, {
                contentType: 'image/jpeg',
                upsert: false,
            });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('profile_pictures').getPublicUrl(filePath);
            
            // Step 2: Update photos array
            let updatedPhotos: string[];
            if (isReplacing && oldPhotoUrl) {
                // Replace the old URL with the new one
                updatedPhotos = photos.map(p => p === oldPhotoUrl ? publicUrl : p);
            } else {
                // Add the new URL
                updatedPhotos = [...photos, publicUrl];
            }
            
            // Step 3: Update database
            let dbError;
            console.log('PhotoGallery: Updating photos for user type:', userType, 'userId:', userId);
            
            if (userType === 'VENDOR') {
                console.log('PhotoGallery: Updating vendor_profiles table with photos:', updatedPhotos);
                const { error } = await supabase.from('vendor_profiles').update({ photos: updatedPhotos }).eq('id', userId);
                dbError = error;
                if (error) {
                    console.error('PhotoGallery: Vendor profile update error:', error);
                } else {
                    console.log('PhotoGallery: Vendor profile updated successfully');
                }
            } else {
                console.log('PhotoGallery: Updating profiles table with photos:', updatedPhotos);
                const { error } = await supabase.from('profiles').update({ photos: updatedPhotos }).eq('id', userId);
                dbError = error;
                if (error) {
                    console.error('PhotoGallery: Profile update error:', error);
                } else {
                    console.log('PhotoGallery: Profile updated successfully');
                }
            }
            
            if (dbError) {
                // DB update failed - clean up the uploaded file and throw error
                console.error('Database update error:', dbError);
                console.error('Attempting to update profile ID:', userId);
                console.error('Current user context:', await supabase.auth.getUser());
                
                // Try to delete the newly uploaded file since DB update failed
                try {
                    await supabase.storage.from('profile_pictures').remove([filePath]);
                    console.log('PhotoGallery: Cleaned up uploaded file after DB error');
                } catch (cleanupError) {
                    console.error('PhotoGallery: Failed to clean up uploaded file:', cleanupError);
                }
                
                throw dbError;
            }

            // Step 4: Delete old file only AFTER DB update succeeds (best effort, don't fail on error)
            if (isReplacing && oldFilePath) {
                try {
                    await supabase.storage.from('profile_pictures').remove([oldFilePath]);
                    console.log('PhotoGallery: Successfully deleted old photo file:', oldFilePath);
                } catch (deleteError) {
                    // Log error but don't surface as failure - DB is already updated with new photo
                    console.error('PhotoGallery: Failed to delete old photo file (non-critical):', deleteError);
                    console.log('PhotoGallery: New photo is active; old file cleanup can be done later');
                }
            }

            // Invalidate pond cache after successful photo update
            if (typeof window !== 'undefined') {
                localStorage.removeItem('pond_cache');
            }

            setPhotos(updatedPhotos);
            setEditingPhotoUrl(null);
            
            // Update carousel index after upload
            if (isReplacing) {
                // After replace: keep same index
                const currentPhotoIndex = updatedPhotos.findIndex(p => p === publicUrl);
                if (currentPhotoIndex !== -1) {
                    setCurrentIndex(currentPhotoIndex);
                    if (instanceRef.current) {
                        instanceRef.current.moveToIdx(currentPhotoIndex);
                    }
                }
            } else {
                // After add: move to newly added photo
                const newIdx = updatedPhotos.length - 1;
                setCurrentIndex(newIdx);
                if (instanceRef.current) {
                    instanceRef.current.moveToIdx(newIdx);
                }
            }

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
            
            // Update database first - determine which table based on user type
            let dbError;
            console.log('PhotoGallery: Deleting photo for user type:', userType, 'userId:', userId);
            
            if (userType === 'VENDOR') {
                console.log('PhotoGallery: Updating vendor_profiles table after photo deletion');
                const { error } = await supabase.from('vendor_profiles').update({ photos: updatedPhotos }).eq('id', userId);
                dbError = error;
                if (error) {
                    console.error('PhotoGallery: Vendor profile delete update error:', error);
                } else {
                    console.log('PhotoGallery: Vendor profile updated after photo deletion');
                }
            } else {
                console.log('PhotoGallery: Updating profiles table after photo deletion');
                const { error } = await supabase.from('profiles').update({ photos: updatedPhotos }).eq('id', userId);
                dbError = error;
                if (error) {
                    console.error('PhotoGallery: Profile delete update error:', error);
                } else {
                    console.log('PhotoGallery: Profile updated after photo deletion');
                }
            }
            
            if (dbError) {
                console.error('Database delete error:', dbError);
                console.error('Attempting to update profile ID:', userId);
                console.error('Current user context:', await supabase.auth.getUser());
                throw dbError;
            }

            // Invalidate pond cache after successful photo deletion
            if (typeof window !== 'undefined') {
                localStorage.removeItem('pond_cache');
            }

            // Delete from storage
            const fileName = new URL(photoUrlToDelete).pathname.split('/').pop();
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
    const isCarousel = !isMatchMakr && displayItems.length > 1;

    return (
        <div className="relative mb-6 px-0">
            <div className="relative w-full aspect-[4/5] rounded-none md:rounded-2xl overflow-hidden shadow-card sm:mx-auto sm:max-w-md">
                {isCarousel ? (
                    <div ref={sliderRef} className="keen-slider w-full h-full">
                        {displayItems.map((item, idx) => (
                            <div className="keen-slider__slide flex items-center justify-center relative" key={idx}>
                                {item === ADD_PHOTO_SLOT && photos.length === 0 ? (
                                    <div className="relative w-full h-full bg-gradient-to-br from-primary-blue/50 to-primary-teal/50 flex items-center justify-center">
                                        <span className="text-6xl font-bold text-white">
                                            {profileName?.charAt(0).toUpperCase() || '?'}
                                        </span>
                                        {canEdit && (
                                            <button
                                                className="absolute bottom-4 right-4 px-3 py-1.5 bg-white/90 backdrop-blur-sm text-text-dark text-sm rounded-full border border-white/30 hover:bg-white transition-colors"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    
                                                    if (!canEdit) {
                                                        console.warn('PhotoGallery: Button clicked but canEdit is false', { canEdit, userType, userId });
                                                        return;
                                                    }
                                                    
                                                    if (!fileInputRef.current) {
                                                        console.error('PhotoGallery: File input ref is null');
                                                        const inputById = document.getElementById(`file-input-${userId}`) as HTMLInputElement;
                                                        if (inputById) {
                                                            inputById.click();
                                                        }
                                                        return;
                                                    }
                                                    
                                                    try {
                                                        fileInputRef.current.click();
                                                    } catch (error) {
                                                        console.error('PhotoGallery: Error clicking file input', error);
                                                        const inputById = document.getElementById(`file-input-${userId}`) as HTMLInputElement;
                                                        if (inputById) {
                                                            inputById.click();
                                                        }
                                                    }
                                                }}
                                                type="button"
                                            >
                                                Add photo
                                            </button>
                                        )}
                                    </div>
                                ) : item === ADD_PHOTO_SLOT ? (
                                    canEdit && (
                                        <button
                                            className="flex flex-col items-center justify-center w-full h-full text-white/80 hover:text-accent-teal-light transition-colors"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                
                                                if (!canEdit) {
                                                    console.warn('PhotoGallery: Button clicked but canEdit is false', { canEdit, userType, userId });
                                                    return;
                                                }
                                                
                                                if (!fileInputRef.current) {
                                                    console.error('PhotoGallery: File input ref is null');
                                                    const inputById = document.getElementById(`file-input-${userId}`) as HTMLInputElement;
                                                    if (inputById) {
                                                        inputById.click();
                                                    }
                                                    return;
                                                }
                                                
                                                try {
                                                    fileInputRef.current.click();
                                                } catch (error) {
                                                    console.error('PhotoGallery: Error clicking file input', error);
                                                    const inputById = document.getElementById(`file-input-${userId}`) as HTMLInputElement;
                                                    if (inputById) {
                                                        inputById.click();
                                                    }
                                                }
                                            }}
                                            type="button"
                                        >
                                            <PlusIcon className="w-10 h-10 mb-2" />
                                            <span className="font-semibold text-lg">Add Photo</span>
                                        </button>
                                    )
                                ) : (
                                    <>
                                        <Image
                                            src={item}
                                            alt={`Profile photo ${idx + 1}`}
                                            fill
                                            sizes="100vw"
                                            className="object-cover rounded-none md:rounded-2xl"
                                            priority={idx === 0}
                                        />
                                        {/* Three dot menu for delete/edit */}
                                        {canEdit && (
                                            <div className="absolute top-2 right-2 z-10">
                                                <button
                                                    className="p-2 rounded-full bg-black/40 hover:bg-black/70 text-white"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setActiveMenuPhotoUrl(item);
                                                    }}
                                                    type="button"
                                                >
                                                    <EllipsisVerticalIcon className="w-6 h-6" />
                                                </button>
                                                {activeMenuPhotoUrl === item && (
                                                    <div ref={menuRef} className="absolute right-0 mt-2 w-32 bg-white rounded-xl shadow-lg z-20 py-2 border border-gray-200">
                                                        <button
                                                            className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-xl font-semibold transition-colors"
                                                            onClick={() => handleEditClick(item)}
                                                        >
                                                            Replace Photo
                                                        </button>
                                                        <button
                                                            className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100 rounded-xl font-semibold transition-colors"
                                                            onClick={() => { setActiveMenuPhotoUrl(null); handlePhotoDelete(item); }}
                                                        >
                                                            Delete Photo
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        {photos.length === 0 ? (
                            <div className="relative w-full h-full bg-gradient-to-br from-primary-blue/50 to-primary-teal/50 flex items-center justify-center">
                                <span className="text-6xl font-bold text-white">
                                    {profileName?.charAt(0).toUpperCase() || '?'}
                                </span>
                                {canEdit && (
                                    <button
                                        className="absolute bottom-4 right-4 px-3 py-1.5 bg-white/90 backdrop-blur-sm text-text-dark text-sm rounded-full border border-white/30 hover:bg-white transition-colors z-50"
                                        style={{ pointerEvents: 'auto', zIndex: 50 }}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            
                                            if (!canEdit) {
                                                console.warn('PhotoGallery: Button clicked but canEdit is false', { canEdit, userType, userId });
                                                return;
                                            }
                                            
                                            if (!fileInputRef.current) {
                                                console.error('PhotoGallery: File input ref is null - cannot trigger file picker');
                                                // Fallback: try accessing by ID
                                                const inputById = document.getElementById(`file-input-${userId}`) as HTMLInputElement;
                                                if (inputById) {
                                                    inputById.click();
                                                } else {
                                                    alert('Error: File input not found. Please refresh the page.');
                                                }
                                                return;
                                            }
                                            
                                            try {
                                                fileInputRef.current.click();
                                            } catch (error) {
                                                console.error('PhotoGallery: Error clicking file input', error);
                                                // Fallback: try accessing by ID
                                                const inputById = document.getElementById(`file-input-${userId}`) as HTMLInputElement;
                                                if (inputById) {
                                                    inputById.click();
                                                } else {
                                                    alert('Error opening file picker. Please try again.');
                                                }
                                            }
                                        }}
                                        type="button"
                                    >
                                        Add photo
                                    </button>
                                )}
                            </div>
                        ) : displayItems[0] === ADD_PHOTO_SLOT ? (
                            canEdit && (
                                <button
                                    className="flex flex-col items-center justify-center w-full h-full text-white/80 hover:text-accent-teal-light transition-colors"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        
                                        if (!canEdit) {
                                            console.warn('PhotoGallery: Button clicked but canEdit is false', { canEdit, userType, userId });
                                            return;
                                        }
                                        
                                        if (!fileInputRef.current) {
                                            console.error('PhotoGallery: File input ref is null');
                                            const inputById = document.getElementById(`file-input-${userId}`) as HTMLInputElement;
                                            if (inputById) {
                                                inputById.click();
                                            }
                                            return;
                                        }
                                        
                                        try {
                                            fileInputRef.current.click();
                                        } catch (error) {
                                            console.error('PhotoGallery: Error clicking file input', error);
                                            const inputById = document.getElementById(`file-input-${userId}`) as HTMLInputElement;
                                            if (inputById) {
                                                inputById.click();
                                            }
                                        }
                                    }}
                                    type="button"
                                >
                                    <PlusIcon className="w-10 h-10 mb-2" />
                                    <span className="font-semibold text-lg">Add Photo</span>
                                </button>
                            )
                        ) : (
                            <>
                                <Image
                                    src={displayItems[0]}
                                    alt="Profile photo"
                                    fill
                                    sizes="100vw"
                                    className="object-cover rounded-none md:rounded-2xl"
                                    priority
                                />
                                {/* Three dot menu for delete/edit */}
                                {canEdit && (
                                    <div className="absolute top-2 right-2 z-10">
                                        <button
                                            className="p-2 rounded-full bg-black/40 hover:bg-black/70 text-white"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setActiveMenuPhotoUrl(displayItems[0] as string);
                                            }}
                                            type="button"
                                        >
                                            <EllipsisVerticalIcon className="w-6 h-6" />
                                        </button>
                                        {activeMenuPhotoUrl === displayItems[0] && (
                                            <div ref={menuRef} className="absolute right-0 mt-2 w-32 bg-white rounded-xl shadow-lg z-20 py-2 border border-gray-200">
                                                <button
                                                    className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-xl font-semibold transition-colors"
                                                    onClick={() => handleEditClick(displayItems[0] as string)}
                                                >
                                                    Replace Photo
                                                </button>
                                                <button
                                                    className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100 rounded-xl font-semibold transition-colors"
                                                    onClick={() => { setActiveMenuPhotoUrl(null); handlePhotoDelete(displayItems[0] as string); }}
                                                >
                                                    Delete Photo
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}
                {/* Gradient overlay */}
                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 to-transparent z-10" />
                {/* Name + Age overlay */}
                {name && (
                    <div className="absolute bottom-4 left-4 z-20 text-white">
                        <div className="text-2xl font-semibold">{name}</div>
                        {age && <div className="text-sm opacity-90">{age}</div>}
                    </div>
                )}
                {/* Photo indicator dots overlay for carousel */}
                {isCarousel && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                        {displayItems.map((item, idx) => (
                            <span
                                key={idx}
                                className={`inline-block w-2 h-2 rounded-full ${idx === currentIndex ? 'bg-white' : 'bg-white/40'} transition-all`}
                            />
                        ))}
                    </div>
                )}
            </div>
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handlePhotoUpload} 
                className="hidden" 
                accept="image/*"
                style={{ display: 'none', position: 'absolute', visibility: 'hidden' }}
                id={`file-input-${userId}`}
            />
            {/* Image Cropper Modal */}
            {imageToCrop && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl ring-1 ring-black/10">
                        <div className="p-5 sm:p-6">
                            <ImageCropper
                                image={imageToCrop}
                                onCropComplete={onCropComplete}
                                onClose={() => {
                                    setImageToCrop(null);
                                    setEditingPhotoUrl(null);
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 