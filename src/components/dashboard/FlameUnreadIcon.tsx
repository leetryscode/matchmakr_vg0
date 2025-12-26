import React from 'react';

interface FlameUnreadIconProps {
  count: number; // 1-9
  size?: number;
  className?: string;
}

const FlameUnreadIcon: React.FC<FlameUnreadIconProps> = ({ count, size = 36, className = '' }) => {
  // Clamp count to 1-9
  const displayCount = Math.max(1, Math.min(9, count));
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`text-primary-teal ${className}`}
      style={{ display: 'block' }}
      aria-label={`Unread messages: ${displayCount}`}
    >
      {/* Classic rounded chat bubble with filled tail */}
      <path
        d="M18 5C10.268 5 4 10.268 4 17c0 3.13 1.51 5.98 4.01 8.01C7.7 28.1 6.5 30.5 6.5 30.5c-.2.4.2.8.6.7l6.1-2.1C14.6 29.7 16.3 30 18 30c7.732 0 14-5.268 14-13S25.732 5 18 5z"
        fill="#fff"
      />
      {/* Notification number */}
      <text
        x="18"
        y="22"
        textAnchor="middle"
        fontSize="15"
        fontWeight="bold"
        fill="currentColor"
        style={{ fontFamily: 'Inter, sans-serif', pointerEvents: 'none', userSelect: 'none' }}
        dominantBaseline="middle"
      >
        {displayCount}
      </text>
    </svg>
  );
};

export default FlameUnreadIcon; 