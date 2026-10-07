/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        // Citizen portal body copy. Noto Sans Ethiopic is a fallback,
        // not the primary face: Inter has no Ge'ez glyphs at all, so the
        // browser automatically substitutes Noto Sans Ethiopic for any
        // Amharic characters while Latin text still renders in Inter.
        sans: ['Inter', '"Noto Sans Ethiopic"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // Console section headings, page titles
        heading: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'sans-serif'],
        // Tracking codes, hashes, account numbers, metrics
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        // ---- Public citizen portal (light, calm) — unchanged ----
        ink: {
          950: '#0A0F1C', 900: '#0F1729', 800: '#16213A', 700: '#1E2C48', 600: '#2A3C60', border: '#233052',
        },
        mist: { 100: '#F5F7FA', 200: '#E8ECF2', 300: '#D6DDE8' },
        fog: { 100: '#C3CCDC', 300: '#8996AC', 500: '#5C6B85' },
        signal: { DEFAULT: '#0EA894', dark: '#0B8272', light: '#5CD6C4', 50: '#E6FAF7' },
        amber: { DEFAULT: '#E8A33D', dark: '#C4822A', 50: '#FEF6E9' },
        critical: { DEFAULT: '#D6483F', dark: '#B23932', 50: '#FBEAE9' },
        verified: { DEFAULT: '#2FA65A', dark: '#238049', 50: '#EAF8EF' },

        // ---- INSA Analyst Console (dark dev-tool aesthetic) ----
        console: {
          bg: '#0B0F19',
          surface: '#111827',
          'surface-hover': '#161F30',
          border: '#1F2937',
        },
        brand: {
          DEFAULT: '#14B8A6',
          dark: '#0D9488',
          light: '#5EEAD4',
          glow: 'rgba(20, 184, 166, 0.35)',
        },
        fg: {
          primary: '#F9FAFB',
          muted: '#9CA3AF',
          faint: '#6B7280',
        },
        status: {
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
        },

        // ---- FBI / High-Tech Tactical Cyber-Ops Palette ----
        ops: {
          bg: '#020617',       // Deep high-contrast obsidian slate
          panel: '#0F172A',    // Midnight tactical panel base
          border: '#1E293B',   // Precise structural grid borders
          accent: '#06B6D4',   // Live cyber intelligence cyan
          alert: '#F43F5E',    // Priority critical red/rose
          warning: '#F59E0B',  // Operational amber caution
          success: '#10B981',  // Confirmed clearance green
        },
      },
      boxShadow: {
        panel: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 1px 3px rgba(0,0,0,0.4)',
        card: '0 1px 2px rgba(16, 24, 38, 0.06), 0 1px 0 rgba(16,24,38,0.04)',
        console: '0 1px 2px rgba(0,0,0,0.3), 0 8px 24px -8px rgba(0,0,0,0.4)',
        'console-lg': '0 4px 6px -1px rgba(0,0,0,0.4), 0 10px 40px -10px rgba(0,0,0,0.5)',
        glow: '0 0 0 1px rgba(20,184,166,0.4), 0 0 20px rgba(20,184,166,0.25)',

        // ---- Cyber-Ops Neon Shadows ----
        'glow-cyan': '0 0 20px -3px rgba(6, 182, 212, 0.3)',
        'glow-rose': '0 0 20px -3px rgba(244, 63, 94, 0.3)',
        'glow-amber': '0 0 20px -3px rgba(245, 158, 11, 0.3)',
      },
      borderRadius: {
        sm: '4px', DEFAULT: '6px', md: '8px', lg: '10px',
        xl: '12px', '2xl': '16px',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}