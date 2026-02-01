'use client';

import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Shows a small "Having trouble connecting" message when boot timed out (?boot_timeout=1).
 * Only when no session — avoids showing after a successful login when user later visits /.
 */
export default function BootTimeoutMessage() {
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const show =
    searchParams.get('boot_timeout') === '1' && !loading && !user;

  if (!show) return null;

  return (
    <p className="text-sm text-white/80 text-center max-w-xs">
      Having trouble connecting. Please try again.
    </p>
  );
}
