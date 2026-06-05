import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        notion: {
          bg: '#FFFFFF',
          bgSecondary: '#F7F7F5',
          text: '#1A1A1A',
          textSecondary: '#6B7280',
          border: '#E5E5E3',
          accent: '#2F3437',
          hover: '#F1F1EF',
        },
        priority: {
          high: '#EF4444',
          medium: '#F59E0B',
          low: '#6366F1',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        md: '6px',
      },
    },
  },
  plugins: [],
}

export default config
