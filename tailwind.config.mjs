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
                sans: ['"Inter"', 'sans-serif'],
                serif: ['"Instrument Serif"', 'serif'],
            },
            colors: {
                cream: {
                    50: '#FDFBF7',
                    100: '#F5F2E8',
                    200: '#EAE7DC',
                    300: '#D8D4C8',
                },
                terracotta: {
                    DEFAULT: '#D97757',
                    hover: '#C06345',
                },
                charcoal: {
                    DEFAULT: '#1F1F1F',
                    light: '#4A4A4A',
                },
            },
            keyframes: {
                fadeUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },
            animation: {
                'fade-up': 'fadeUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
            },
        },
    },
    plugins: [],
};
