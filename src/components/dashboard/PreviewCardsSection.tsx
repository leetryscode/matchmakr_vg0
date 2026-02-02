'use client';

import React, { useState, useEffect } from 'react';
import PreviewCard from './PreviewCard';
import Toast from '@/components/ui/Toast';

interface SneakPeek {
    id: string;
    target_single_id: string;
    photo_url: string;
    created_at: string;
    expires_at: string;
}

interface PreviewCardsSectionProps {
    userId: string;
}

export default function PreviewCardsSection({ userId }: PreviewCardsSectionProps) {
    const [previews, setPreviews] = useState<SneakPeek[]>([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

    const fetchPreviews = async () => {
        try {
            const response = await fetch(`/api/sneak-peeks?for=single&singleId=${userId}`);
            const data = await response.json();

            if (data.success && data.sneakPeeks) {
                setPreviews(data.sneakPeeks);
            } else {
                setPreviews([]);
            }
        } catch (error) {
            console.error('Error fetching previews:', error);
            setPreviews([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userId) {
            fetchPreviews();
        }
    }, [userId]);

    const handleResponse = async (previewId: string, status: 'OPEN_TO_IT' | 'NOT_SURE_YET' | 'DISMISSED') => {
        // Optimistically remove the card
        const previewToRestore = previews.find(p => p.id === previewId);
        setPreviews(prev => prev.filter(p => p.id !== previewId));
        setProcessingIds(prev => new Set(prev).add(previewId));

        try {
            const response = await fetch(`/api/sneak-peeks/${previewId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status }),
            });

            if (!response.ok) {
                // Reinsert the card on error
                if (previewToRestore) {
                    setPreviews(prev => [...prev, previewToRestore].sort((a, b) => 
                        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                    ));
                }
                setToast({ message: 'Something went wrong. Try again.', type: 'error' });
            }
            // Success: card stays removed (no toast, silence is intentional)
        } catch (error) {
            console.error('Error responding to preview:', error);
            // Reinsert the card on error
            if (previewToRestore) {
                setPreviews(prev => [...prev, previewToRestore].sort((a, b) => 
                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                ));
            }
            setToast({ message: 'Something went wrong. Try again.', type: 'error' });
        } finally {
            setProcessingIds(prev => {
                const next = new Set(prev);
                next.delete(previewId);
                return next;
            });
        }
    };

    // Don't render anything if loading or no previews
    if (loading || previews.length === 0) {
        return null;
    }

    return (
        <>
            <section className="mt-6 first:mt-0">
                <h2 className="type-section text-text-dark">
                    Your sponsor shared someone
                </h2>
                <p className="mt-4 type-meta text-text-light">
                    The other person won't see this. Your response only helps your sponsor understand how you feel — nothing happens automatically.
                </p>
                <div className="mt-4 flex flex-col gap-3">
                    {previews.map((preview) => (
                        <PreviewCard
                            key={preview.id}
                            id={preview.id}
                            photoUrl={preview.photo_url}
                            onOpenToIt={() => handleResponse(preview.id, 'OPEN_TO_IT')}
                            onNotSureYet={() => handleResponse(preview.id, 'NOT_SURE_YET')}
                            onDismiss={() => handleResponse(preview.id, 'DISMISSED')}
                            isProcessing={processingIds.has(preview.id)}
                        />
                    ))}
                </div>
            </section>

            {/* Toast for errors only */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    isVisible={!!toast}
                    onClose={() => setToast(null)}
                />
            )}
        </>
    );
}

