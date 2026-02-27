'use client';

import React, { useState } from 'react';
import { SingleStatus, getSingleFacingStatusLabel, getSingleFacingStatusExplanation, getStatusPillClasses } from '@/lib/status/singleStatus';
import { createClient } from '@/lib/supabase/client';

interface AvailabilitySectionProps {
  status: SingleStatus;
  userId: string;
  onStatusChange?: () => void;
}

const AvailabilitySection: React.FC<AvailabilitySectionProps> = ({ status, userId, onStatusChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<SingleStatus>(status);
  const supabase = createClient();

  // Update local status when prop changes (e.g., after refetch)
  React.useEffect(() => {
    setCurrentStatus(status);
  }, [status]);

  const handleTogglePause = async () => {
    setIsUpdating(true);
    try {
      if (currentStatus === 'PAUSED') {
        // Resume: set paused_at to null
        // Only update paused_at - do not touch other fields
        const { error } = await supabase
          .from('profiles')
          .update({ paused_at: null })
          .eq('id', userId)
          .select('paused_at')
          .single();
        
        if (error) throw error;
        
        // Optimistically update local state
        setCurrentStatus('NEEDS_INTRODUCTION'); // Will be recalculated on next render, but this prevents flicker
      } else {
        // Pause: set paused_at to now
        // Only update paused_at - do not touch other fields
        const { error } = await supabase
          .from('profiles')
          .update({ paused_at: new Date().toISOString() })
          .eq('id', userId)
          .select('paused_at')
          .single();
        
        if (error) throw error;
        
        // Optimistically update local state
        setCurrentStatus('PAUSED');
      }
      
      // Refresh the page to show updated status (ensures all data is fresh)
      if (onStatusChange) {
        onStatusChange();
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error updating availability:', error);
      alert('Failed to update availability. Please try again.');
      // Revert optimistic update on error
      setCurrentStatus(status);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div 
      onClick={() => setIsExpanded(!isExpanded)}
      className="orbit-surface-soft hover:bg-orbit-border/20 rounded-card-lg border border-orbit-border/50 p-4 cursor-pointer transition-all duration-150 active:scale-[0.99]"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsExpanded(!isExpanded);
        }
      }}
    >
      {/* Always visible: Status pill and explanation */}
      {/* Row 1: Pill (left) + Chevron (right) */}
      <div className="flex items-center justify-between mb-2">
        <span className={`${getStatusPillClasses(currentStatus)} transition-colors duration-150`}>
          {getSingleFacingStatusLabel(currentStatus)}
        </span>
        
        {/* Expand/collapse chevron */}
        <div className="flex-shrink-0 p-1 text-orbit-muted">
          <svg
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
            className={`transition-transform duration-150 ${isExpanded ? 'rotate-180' : ''}`}
          >
            <polyline points="6,9 12,15 18,9" />
          </svg>
        </div>
      </div>
      
      {/* Row 2: Explanation text */}
      <p className="text-sm text-orbit-text2 leading-relaxed">
        {getSingleFacingStatusExplanation(currentStatus)}
      </p>

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-orbit-border/50">
          {/* Helper text block - tight stack */}
          <div className="mb-3 space-y-1">
            <p className="text-xs text-orbit-muted">
              Only you and your sponsor can see this status.
            </p>
            <p className="text-xs text-orbit-muted">
              This helps communicate your availability — it doesn't affect existing conversations.
            </p>
          </div>
          
          {/* Divider */}
          <div className="border-t border-orbit-border/30 mb-3"></div>
          
          {/* Actions row */}
          <div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleTogglePause();
              }}
              disabled={isUpdating}
              className="orbit-btn-secondary px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdating ? 'Updating...' : currentStatus === 'PAUSED' ? 'Resume introductions' : 'Pause introductions'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvailabilitySection;

