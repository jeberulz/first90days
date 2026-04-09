/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['var(--font-inter)', 'sans-serif'],
                outfit: ['var(--font-outfit)', 'sans-serif'],
                'instrument-serif': ['var(--font-instrument-serif)', 'serif'],
                'space-grotesk': ['var(--font-space-grotesk)', 'sans-serif'],
            },
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                accent: {
                    DEFAULT: '#D97757',
                    hover: '#C26242',
                },
                paper: {
                    DEFAULT: '#F5F2E8',
                    dark: '#0F0E0D',
                    muted: '#FAF9F6',
                },
                warm: {
                    ink: '#1C1917',
                    600: '#44403C',
                    500: '#57534E',
                    400: '#78716C',
                    300: '#A8A29E',
                    border: '#D1CDC7',
                    line: '#E7E5E4',
                    cardDark: '#1C1917',
                    surfaceDark: '#292524',
                    borderDark: '#2C2825',
                    borderMuted: '#44403C',
                },
                neutral: {
                    50: '#fafafa',
                    100: '#f5f5f5',
                    200: '#e5e5e5',
                    300: '#d4d4d4',
                    400: '#a3a3a3',
                    500: '#737373',
                    600: '#525252',
                    700: '#404040',
                    800: '#262626',
                    900: '#171717',
                    950: '#0a0a0a',
                },
            },
            keyframes: {
                fadeUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideIn: {
                    from: { opacity: '0', transform: 'translateX(24px)' },
                    to: { opacity: '1', transform: 'translateX(0)' },
                },
                slideOutLeft: {
                    from: { opacity: '1', transform: 'translateX(0)' },
                    to: { opacity: '0', transform: 'translateX(-24px)' },
                },
                fadeInUp: {
                    from: { opacity: '0', transform: 'translateY(12px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
                pulseGlow: {
                    '0%, 100%': { boxShadow: '0 0 0 0 rgba(217,119,87,0.3)' },
                    '50%': { boxShadow: '0 0 0 8px rgba(217,119,87,0)' },
                },
                pulse: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '.5' },
                },
                spin: {
                    from: { transform: 'rotate(0deg)' },
                    to: { transform: 'rotate(360deg)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-6px)' },
                },
            },
            animation: {
                'fade-up': 'fadeUp 0.8s ease-out forwards',
                'slide-in': 'slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'slide-out-left': 'slideOutLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'fade-in-up': 'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'pulse-glow': 'pulseGlow 2s infinite',
                'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'spin-slow': 'spin 8s linear infinite',
                'float': 'float 3s ease-in-out infinite',
            },
        },
    },
    plugins: [],
};
