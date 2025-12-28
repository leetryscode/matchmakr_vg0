'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function DateIdeasPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Redirect if not authenticated
  if (!authLoading && !user) {
    router.push('/');
    return null;
  }

  // Show loading while auth is being checked
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-primary-blue to-accent-teal-light p-6 text-white">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gradient-to-b from-primary-blue to-accent-teal-light p-6 text-white">
      {/* Date Ideas Header */}
      <div className="w-full text-center mb-8 mt-8">
        <h1 className="text-2xl font-light tracking-[0.05em] font-brand">
          Date Ideas
        </h1>
      </div>
      
      {/* Coming Soon Content */}
      <div className="w-full max-w-2xl">
        <div className="bg-white/10 p-8 rounded-xl border border-white/20 text-center">
          <p className="text-white/80 text-lg">Coming soon</p>
        </div>
      </div>
    </div>
  );
}

