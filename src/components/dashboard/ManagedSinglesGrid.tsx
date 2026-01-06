'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import SectionHeader from '@/components/ui/SectionHeader';
import ManagedSingleCard from './ManagedSingleCard';

interface ManagedSinglesGridProps {
    singles: Array<{
        id: string;
        name: string | null;
    }>;
}

const ManagedSinglesGrid: React.FC<ManagedSinglesGridProps> = ({ singles }) => {
    const router = useRouter();

    const handleCardClick = (singleId: string) => {
        router.push(`/profile/${singleId}`);
    };

    return (
        <div>
            <SectionHeader title="Managed Singles" className="mt-10" />
            
            {!singles || singles.length === 0 ? (
                <div className="bg-white/5 rounded-card-lg border border-white/10 p-6 text-center mt-2">
                    <p className="type-meta text-white/70">No managed singles yet</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-3 mt-2">
                    {singles.map((single) => (
                        <ManagedSingleCard
                            key={single.id}
                            single={single}
                            onClick={() => handleCardClick(single.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default ManagedSinglesGrid;

