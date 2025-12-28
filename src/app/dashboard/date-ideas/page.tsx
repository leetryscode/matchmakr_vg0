'use client';

import { useAuth } from '@/contexts/AuthContext';
import DashboardWrapper from '@/components/dashboard/DashboardWrapper';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import GlassCard from '@/components/ui/GlassCard';

export default function DateIdeasPage() {
  const { user } = useAuth();

  if (!user) {
    return null; // DashboardWrapper handles redirect
  }

  return (
    <DashboardWrapper>
      <DashboardLayout firstName={null} userId={user.id}>
        <div className="flex flex-col space-y-6 w-full">
          {/* Date Ideas Header */}
          <div className="w-full text-center">
            <h1 className="text-2xl font-light tracking-[0.05em] font-brand">
              Date Ideas
            </h1>
          </div>
          
          {/* Coming Soon Content */}
          <GlassCard variant="1" className="p-8">
            <div className="text-center">
              <p className="text-white/80 text-lg">Coming soon</p>
            </div>
          </GlassCard>
        </div>
      </DashboardLayout>
    </DashboardWrapper>
  );
}

