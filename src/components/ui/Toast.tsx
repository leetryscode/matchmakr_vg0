'use client';

import React, { useEffect } from 'react';

interface ToastProps {
    message: string;
    type: 'success' | 'error';
    isVisible: boolean;
    onClose: () => void;
    duration?: number;
}

export default function Toast({ message, type, isVisible, onClose, duration = 3000 }: ToastProps) {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [isVisible, duration, onClose]);

    if (!isVisible) return null;

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] transition-opacity duration-300">
            <div
                className={`px-6 py-3 rounded-lg shadow-lg backdrop-blur-md border ${
                    type === 'success'
                        ? 'bg-green-500/90 text-white border-green-400'
                        : 'bg-red-500/90 text-white border-red-400'
                }`}
            >
                <p className="font-medium text-sm">{message}</p>
            </div>
        </div>
    );
}

