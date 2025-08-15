'use client';

import React, { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CreateOfferData } from '../profile/types';

interface CreateOfferModalProps {
    isOpen: boolean;
    onClose: () => void;
    onOfferCreated: () => void;
}

export default function CreateOfferModal({ isOpen, onClose, onOfferCreated }: CreateOfferModalProps) {
    const [formData, setFormData] = useState<CreateOfferData>({
        title: '',
        description: '',
        duration_days: 30,
        photos: []
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    const supabase = createClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            // If there's a photo, upload it first
            let photoUrls: string[] = [];
            if (selectedPhoto) {
                const fileName = `${Date.now()}.jpg`;
                const filePath = `offers/${fileName}`;
                
                const { error: uploadError } = await supabase.storage
                    .from('profile_pictures') // Using same bucket for now
                    .upload(filePath, selectedPhoto, {
                        contentType: 'image/jpeg',
                        upsert: false,
                    });
                
                if (uploadError) {
                    throw new Error(`Photo upload failed: ${uploadError.message}`);
                }
                
                const { data: { publicUrl } } = supabase.storage
                    .from('profile_pictures')
                    .getPublicUrl(filePath);
                
                photoUrls = [publicUrl];
            }
            
            // Create offer with photo URLs
            const offerData = {
                ...formData,
                photos: photoUrls
            };
            
            const response = await fetch('/api/offers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(offerData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create offer');
            }

            // Reset form and close modal
            setFormData({
                title: '',
                description: '',
                duration_days: 30,
                photos: []
            });
            setSelectedPhoto(null);
            setPhotoPreview(null);
            onOfferCreated();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'duration_days' ? parseInt(value) : value
        }));
    };

    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                setError('Please select an image file');
                return;
            }
            
            // Validate file size (5MB)
            if (file.size > 5 * 1024 * 1024) {
                setError('Image must be less than 5MB');
                return;
            }
            
            setSelectedPhoto(file);
            setError(null);
            
            // Create preview
            const reader = new FileReader();
            reader.onload = () => {
                setPhotoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const removePhoto = () => {
        setSelectedPhoto(null);
        setPhotoPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-light text-gray-900">Create New Offer</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                            Offer Title *
                        </label>
                        <input
                            type="text"
                            id="title"
                            name="title"
                            value={formData.title}
                            onChange={handleInputChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                            placeholder="e.g., Romantic Dinner for Two"
                        />
                    </div>

                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                            Description *
                        </label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            required
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                            placeholder="Describe your offer in detail..."
                        />
                    </div>

                    <div>
                        <label htmlFor="duration_days" className="block text-sm font-medium text-gray-700 mb-2">
                            Valid for (days) *
                        </label>
                        <select
                            id="duration_days"
                            name="duration_days"
                            value={formData.duration_days}
                            onChange={handleInputChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                        >
                            <option value={7}>7 days</option>
                            <option value={14}>14 days</option>
                            <option value={30}>30 days</option>
                            <option value={60}>60 days</option>
                            <option value={90}>90 days</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="photo" className="block text-sm font-medium text-gray-700 mb-2">
                            Offer Photo (Optional)
                        </label>
                        <div className="space-y-3">
                            {photoPreview ? (
                                <div className="relative">
                                    <img 
                                        src={photoPreview} 
                                        alt="Preview" 
                                        className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                                    />
                                    <button
                                        type="button"
                                        onClick={removePhoto}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                                    >
                                        ×
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary-blue hover:text-primary-blue transition-colors"
                                >
                                    + Add Photo
                                </button>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                id="photo"
                                accept="image/*"
                                onChange={handlePhotoSelect}
                                className="hidden"
                            />
                            <p className="text-xs text-gray-500">
                                JPEG, PNG, or WebP. Max 5MB.
                            </p>
                        </div>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-primary-blue text-white py-3 px-4 rounded-lg hover:bg-primary-blue-dark transition-colors font-light disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Creating...' : 'Create Offer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
} 