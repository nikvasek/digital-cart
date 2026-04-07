/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ─── BRAND COLORS ────────────────────────────────────────────────────
        // Change these shades for each new project.
        // Quick picker: https://www.tailwindshades.com/
        // Current: Sky blue (default template)
        // Examples:
        //   Violet  — 50:#f5f3ff 100:#ede9fe 500:#8b5cf6 600:#7c3aed 700:#6d28d9
        //   Emerald — 50:#ecfdf5 100:#d1fae5 500:#10b981 600:#059669 700:#047857
        //   Rose    — 50:#fff1f2 100:#ffe4e6 500:#f43f5e 600:#e11d48 700:#be123c
        // ─────────────────────────────────────────────────────────────────────
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        }
      }
    },
  },
  plugins: [],
}
