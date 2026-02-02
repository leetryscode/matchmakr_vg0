import type { Config } from "tailwindcss";
import { palette } from "./src/config/palette";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    // Status pill colors (used dynamically via getStatusStyles / getSingleFacingStatusStyles)
    'border-status-paused',
    'text-status-paused',
    'border-status-invited',
    'text-status-invited',
    'border-status-needs-attention',
    'text-status-needs-attention',
    'border-status-in-motion',
    'text-status-in-motion',
    'border-status-needs-introduction',
    'text-status-needs-introduction',
    // Preview response capsule borders (status color at 50% opacity)
    'border-status-needs-attention/50',
    'border-status-in-motion/50',
    'border-status-paused/50',
  ],
  theme: {
    extend: {
      colors: {
        primary: palette.primary,
        accent: palette.accent,
        background: palette.background,
        text: palette.text,
        border: palette.border,
        action: palette.action,
        status: {
          paused: palette.status.paused,
          invited: palette.status.invited,
          'needs-attention': palette.status.needs_attention,
          'in-motion': palette.status.in_motion,
          'needs-introduction': palette.status.needs_introduction,
        },
      },
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
        'source-sans': ['Source Sans Pro', 'sans-serif'],
        'raleway': ['Raleway', 'sans-serif'],
        'brand': ['Bahnschrift Light', 'Bahnschrift', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'dashboard': `linear-gradient(to bottom right, ${palette.primary.blue}, ${palette.primary.teal})`,
        'gradient-primary': `linear-gradient(135deg, ${palette.primary.blue}, ${palette.primary.teal})`,
        'gradient-light': `linear-gradient(135deg, ${palette.primary['blue-light']}, ${palette.primary['teal-light']})`,
        'gradient-card': `linear-gradient(135deg, ${palette.background.main} 0%, ${palette.background.card} 100%)`,
        'gradient-radial': `radial-gradient(ellipse at center, ${palette.primary.blue} 0%, ${palette.primary.teal} 100%)`,
        'gradient-diagonal': `linear-gradient(45deg, ${palette.primary.blue} 0%, ${palette.primary.teal} 100%)`,
      },
      boxShadow: {
        'card': '0 6px 28px rgba(15, 23, 42, 0.07)',
        'card-hover': '0 14px 36px rgba(15, 23, 42, 0.09)',
        'float': '0 4px 16px rgba(15, 23, 42, 0.10)',
        'deep': '0 6px 32px rgba(15, 23, 42, 0.10)',
        'deep-hover': '0 12px 48px rgba(15, 23, 42, 0.12)',
        // Legacy shadows - kept for backwards compatibility
        'primary': '0 4px 16px rgba(15, 23, 42, 0.10)',
        'primary-hover': '0 8px 24px rgba(15, 23, 42, 0.12)',
        'accent': '0 4px 16px rgba(15, 23, 42, 0.10)',
        'accent-hover': '0 8px 24px rgba(15, 23, 42, 0.12)',
        'header': '0 12px 32px rgba(15, 23, 42, 0.10)',
        'button': '0 2px 12px rgba(15, 23, 42, 0.08)',
        'button-hover': '0 4px 20px rgba(15, 23, 42, 0.12)',
        'avatar': '0 2px 8px rgba(15, 23, 42, 0.08)',
        'avatar-hover': '0 4px 16px rgba(15, 23, 42, 0.12)',
        /** Entry CTA: soft lift only, no glow */
        'cta-entry': '0 4px 12px rgba(0, 0, 0, 0.12)',
      },
      borderRadius: {
        'xl': '20px',
        '2xl': '24px',
        // Dashboard design tokens: rounded-card (12px) and rounded-pill (9999px)
        // This step intentionally introduces tokens without enforcing usage;
        // layout and visual unification will follow in subsequent steps.
        'card': '12px',
        'card-lg': '16px',
        'pill': '9999px',
        /** Entry CTA: 14–16px rounded, not pill */
        'cta': '14px',
      },
    },
  },
  plugins: [],
};
export default config;