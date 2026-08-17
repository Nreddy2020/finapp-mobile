/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class',
    // NativeWind v4 — must set preset
    presets: [require('nativewind/preset')],
    content: [
        "./app/**/*.{js,jsx,ts,tsx}",
        "./components/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "#09090B",
                surface: "#18181B",
                primary: "#4F46E5",
                secondary: "#EC4899",
                accent: "#8B5CF6",
                success: "#10B981",
                warning: "#F59E0B",
                error: "#EF4444",
                textPrimary: "#FAFAFA",
                textSecondary: "#A1A1AA",
                border: "#27272A",
            },
        },
    },
    plugins: [],
};
