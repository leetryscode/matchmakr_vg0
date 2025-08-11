import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          blue: '#0066FF',
          teal: '#00C9A7',
          'blue-light': '#4D9CFF',
          'teal-light': '#4DDDCC',
        },
        accent: {
          'blue-light': '#4D9CFF',
          'teal-light': '#4DDDCC',
        },
        background: {
          main: '#F8FAFC',
          card: '#FFFFFF',
          'gradient-start': '#0066FF',
          'gradient-end': '#00C9A7',
        },
        text: {
          dark: '#1E293B',
          light: '#64748B',
        },
        border: {
          light: '#E2E8F0',
        },
      },
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
        'source-sans': ['Source Sans Pro', 'sans-serif'],
        'raleway': ['Raleway', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #0066FF, #00C9A7)',
        'gradient-light': 'linear-gradient(135deg, #4D9CFF, #4DDDCC)',
        'gradient-card': 'linear-gradient(135deg, #F8FAFC 0%, #FFFFFF 100%)',
        'gradient-radial': 'radial-gradient(ellipse at center, #0066FF 0%, #00C9A7 100%)',
        'gradient-diagonal': 'linear-gradient(45deg, #0066FF 0%, #00C9A7 100%)',
      },
      boxShadow: {
        'card': '0 8px 32px rgba(0,102,255,0.08)',
        'card-hover': '0 20px 40px rgba(0,102,255,0.12)',
        'primary': '0 6px 20px rgba(0,102,255,0.3)',
        'primary-hover': '0 12px 30px rgba(0,102,255,0.4)',
        'accent': '0 6px 20px rgba(0,201,167,0.3)',
        'accent-hover': '0 12px 30px rgba(0,201,167,0.4)',
        'header': '0 20px 40px rgba(0,102,255,0.2)',
        'button': '0 4px 15px rgba(0,102,255,0.15)',
        'button-hover': '0 8px 25px rgba(0,102,255,0.25)',
        'avatar': '0 4px 12px rgba(0,102,255,0.15)',
        'avatar-hover': '0 8px 20px rgba(0,102,255,0.25)',
        'deep': '0 10px 40px rgba(0,102,255,0.2)',
        'deep-hover': '0 20px 60px rgba(0,102,255,0.3)',
      },
      borderRadius: {
        'xl': '20px',
        '2xl': '24px',
      },
    },
  },
  plugins: [],
};
export default config;