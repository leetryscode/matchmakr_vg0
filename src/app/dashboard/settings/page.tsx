"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardWrapper from '@/components/dashboard/DashboardWrapper';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import GlassCard from '@/components/ui/GlassCard';
import SectionHeader from '@/components/ui/SectionHeader';
import Toast from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

function DeleteAccountModal({ isOpen, onClose, onConfirm, isDeleting }: DeleteAccountModalProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="orbit-surface-strong backdrop-blur-md rounded-lg border border-orbit-border/50 shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-orbit-text mb-3">Delete account?</h3>
        <p className="text-orbit-text2 mb-6">
          This permanently removes your account and data.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 text-orbit-text2 hover:text-orbit-text border border-orbit-border/50 rounded-lg hover:bg-orbit-border/20 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-orbit-border/50 border-t-orbit-text rounded-full animate-spin"></div>
                Deleting...
              </>
            ) : (
              'Delete account'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [theme, setTheme] = useState<string>('navy-classic');

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme || 'navy-classic');
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;
      
      const supabase = createClient();
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        setUserName(profile.name);
      }
    };

    fetchProfile();
  }, [user?.id]);

  if (!user) {
    return null; // DashboardWrapper handles redirect
  }

  const handleSaveName = async () => {
    if (!user?.id) return;
    
    setIsSavingName(true);
    const supabase = createClient();
    const trimmedName = editedName.trim();
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name: trimmedName || null })
        .eq('id', user.id);
      
      if (error) {
        console.error('Error saving name:', error);
        alert('Failed to save name. Please try again.');
      } else {
        setUserName(trimmedName || null);
        setIsEditingName(false);
      }
    } catch (err) {
      console.error('Error saving name:', err);
      alert('Failed to save name. Please try again.');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleEditNameClick = () => {
    setEditedName(userName || '');
    setIsEditingName(true);
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    setEditedName('');
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    document.documentElement.dataset.theme = newTheme;
    try {
      localStorage.setItem('orbit_theme', newTheme);
    } catch {
      // localStorage can throw in some contexts
    }
  };

  const handleLogout = async () => {
    console.log('Logout button clicked');
    try {
      // Call server-side logout route
      const response = await fetch('/api/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        console.log('Server logout successful');
        // Clear client-side storage
        localStorage.clear();
        sessionStorage.clear();
        // Clear all cookies
        document.cookie.split(';').forEach(function(c) {
          document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
        });
        // Redirect to welcome page
        window.location.href = '/';
      } else {
        console.error('Server logout failed');
        window.location.href = '/';
      }
    } catch (err) {
      console.error('Logout error:', err);
      window.location.href = '/';
    }
  };

  const handleDeleteAccount = async () => {
    if (!user?.id) return;
    setIsDeleting(true);
    setToast(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke('delete-account');

      if (error) {
        setToast({ message: error.message ?? 'Failed to delete account.', type: 'error' });
        return;
      }
      if (data?.error) {
        setToast({ message: typeof data.error === 'string' ? data.error : 'Failed to delete account.', type: 'error' });
        return;
      }

      await supabase.auth.signOut();
      localStorage.clear();
      sessionStorage.clear();
      router.replace('/');
    } catch (err) {
      console.error('Error deleting account:', err);
      setToast({ message: err instanceof Error ? err.message : 'Failed to delete account. Please try again.', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DashboardWrapper>
      <DashboardLayout firstName={null} userId={user.id}>
        <div className="flex flex-col space-y-6 w-full">
          {/* Settings Header */}
          <div className="w-full text-center">
            <h1 className="type-section">Settings</h1>
          </div>

          {/* Theme Selector */}
          <GlassCard variant="1" className="p-6">
            <SectionHeader title="Appearance" className="mb-4" />
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => handleThemeChange('navy-classic')}
                className={`orbit-ring px-6 py-3 rounded-pill font-medium transition-colors ${
                  theme === 'navy-classic'
                    ? 'orbit-surface-strong text-orbit-text'
                    : 'orbit-btn-secondary'
                }`}
              >
                Navy Classic
              </button>
              <button
                onClick={() => handleThemeChange('plum-society')}
                className={`orbit-ring px-6 py-3 rounded-pill font-medium transition-colors ${
                  theme === 'plum-society'
                    ? 'orbit-surface-strong text-orbit-text'
                    : 'orbit-btn-secondary'
                }`}
              >
                Plum Society
              </button>
              <button
                onClick={() => handleThemeChange('invitation-cream')}
                className={`orbit-ring px-6 py-3 rounded-pill font-medium transition-colors ${
                  theme === 'invitation-cream'
                    ? 'orbit-surface-strong text-orbit-text'
                    : 'orbit-btn-secondary'
                }`}
              >
                Invitation Cream
              </button>
              <button
                onClick={() => handleThemeChange('dev-charcoal')}
                className={`orbit-ring px-6 py-3 rounded-pill font-medium transition-colors ${
                  theme === 'dev-charcoal'
                    ? 'orbit-surface-strong text-orbit-text'
                    : 'orbit-btn-secondary'
                }`}
              >
                Dev Charcoal
              </button>
            </div>
          </GlassCard>
          
          {/* Account Card */}
          <GlassCard variant="1" className="p-6">
            <SectionHeader title="Account" className="mb-4" />
            <div className="space-y-4">
              {/* Name Row */}
              <div className="flex items-center justify-between py-3 border-b border-orbit-border/50">
                <span className="text-orbit-text2 font-medium">Name:</span>
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveName();
                        } else if (e.key === 'Escape') {
                          handleCancelEdit();
                        }
                      }}
                      autoFocus
                      className="bg-orbit-surface/80 border border-orbit-border/50 rounded px-2 py-1 text-orbit-text text-sm focus:outline-none focus:ring-2 focus:ring-orbit-gold/30 orbit-ring"
                      disabled={isSavingName}
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={isSavingName}
                      className="text-accent-teal-light hover:text-accent-teal text-sm font-medium disabled:opacity-50"
                    >
                      {isSavingName ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={isSavingName}
                      className="text-orbit-muted hover:text-orbit-text text-sm font-medium disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className={userName ? "text-orbit-text" : "text-orbit-muted italic"}>
                      {userName || 'Add name'}
                    </span>
                    <button
                      onClick={handleEditNameClick}
                      className="text-orbit-muted hover:text-orbit-text text-sm font-medium ml-2"
                    >
                      {userName ? 'Edit' : 'Add'}
                    </button>
                  </div>
                )}
              </div>
              
              {/* Email Row */}
              <div className="flex items-center justify-between py-3">
                <span className="text-orbit-text2 font-medium">Email:</span>
                <span className="text-orbit-text">{user?.email || 'Not set'}</span>
              </div>
            </div>
          </GlassCard>

          {/* Actions Section */}
          <div className="space-y-3">
            {/* Sign Out Button */}
            <button
              onClick={handleLogout}
              className="w-full orbit-surface-soft hover:bg-orbit-border/20 text-orbit-text font-semibold py-3 px-6 rounded-xl border border-orbit-border/50 transition-all duration-200"
            >
              Sign out
            </button>

            {/* Delete Account Button */}
            <button
              onClick={() => setShowDeleteModal(true)}
              className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 font-semibold py-3 px-6 rounded-xl border border-red-500/30 hover:border-red-500/50 transition-all duration-200"
            >
              Delete account
            </button>
          </div>
        </div>

        {/* Delete Account Modal */}
        <DeleteAccountModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteAccount}
          isDeleting={isDeleting}
        />

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            isVisible
            onClose={() => setToast(null)}
          />
        )}
      </DashboardLayout>
    </DashboardWrapper>
  );
} 