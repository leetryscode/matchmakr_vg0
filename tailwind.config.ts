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
          blue: '#00A3FF',
          'blue-light': '#40C4FF',
        },
        accent: {
          yellow: '#FFD700',
          'yellow-light': '#FFE082',
          coral: '#FF8A80',
        },
        background: {
          main: '#F5F5F5',
          card: '#FFFFFF',
        }
      },
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
        'source-sans': ['Source Sans Pro', 'sans-serif'],
        'raleway': ['Raleway', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #00A3FF 0%, #40C4FF 100%)',
        'gradient-accent': 'linear-gradient(135deg, #FFD700 0%, #FFE082 100%)',
        'gradient-coral': 'linear-gradient(135deg, #FF8A80 0%, #FFB2B2 100%)',
        'gradient-card': 'linear-gradient(135deg, #F5F5F5 0%, #FFFFFF 100%)',
      },
      boxShadow: {
        'card': '0 8px 32px rgba(0,0,0,0.08)',
        'card-hover': '0 20px 40px rgba(0,0,0,0.12)',
        'primary': '0 6px 20px rgba(0,163,255,0.3)',
        'primary-hover': '0 12px 30px rgba(0,163,255,0.4)',
        'accent': '0 6px 20px rgba(255,215,0,0.3)',
        'accent-hover': '0 12px 30px rgba(255,215,0,0.4)',
        'header': '0 20px 40px rgba(0,163,255,0.2)',
        'button': '0 4px 15px rgba(0,0,0,0.15)',
        'button-hover': '0 8px 25px rgba(0,0,0,0.25)',
        'avatar': '0 4px 12px rgba(0,0,0,0.15)',
        'avatar-hover': '0 8px 20px rgba(0,0,0,0.25)',
        'deep': '0 10px 40px rgba(0,0,0,0.2)',
        'deep-hover': '0 20px 60px rgba(0,0,0,0.3)',
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