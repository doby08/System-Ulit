import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#05070F",
          900: "#070B18",
          850: "#0A0F20",
          800: "#0C1226",
          750: "#101833",
          700: "#141D3B",
          600: "#1B2750",
        },
        brand: {
          50: "#EEF4FF",
          100: "#DCE7FF",
          200: "#BBD0FF",
          300: "#8FB0FF",
          400: "#5C88FB",
          500: "#3B6BF6",
          600: "#2A4FE0",
          700: "#223DB4",
          800: "#1F358E",
          900: "#1E3071",
        },
        accent: {
          indigo: "#6366F1",
          violet: "#8B5CF6",
          purple: "#A855F7",
          cyan: "#22D3EE",
          teal: "#2DD4BF",
          amber: "#FBBF24",
          rose: "#FB7185",
          emerald: "#34D399",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(99,102,241,0.25), 0 18px 45px -18px rgba(59,107,246,0.55)",
        card: "0 18px 40px -24px rgba(2,6,23,0.85)",
        "card-hover": "0 28px 60px -28px rgba(59,107,246,0.55)",
        inset: "inset 0 1px 0 0 rgba(255,255,255,0.06)",
      },
      backgroundImage: {
        "grid-glow":
          "radial-gradient(circle at 20% 0%, rgba(59,107,246,0.20), transparent 45%), radial-gradient(circle at 85% 10%, rgba(168,85,247,0.16), transparent 42%), radial-gradient(circle at 50% 100%, rgba(34,211,238,0.12), transparent 48%)",
        "brand-gradient": "linear-gradient(120deg, #3B6BF6 0%, #6366F1 45%, #A855F7 100%)",
        "cyan-gradient": "linear-gradient(120deg, #22D3EE 0%, #3B6BF6 100%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-700px 0" },
          "100%": { backgroundPosition: "700px 0" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.85)", opacity: "0.75" },
          "70%": { transform: "scale(1.6)", opacity: "0" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "progress-stripe": {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "40px 0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.45s cubic-bezier(0.22,1,0.36,1) both",
        "fade-in": "fade-in 0.3s ease-out both",
        shimmer: "shimmer 1.6s linear infinite",
        "pulse-ring": "pulse-ring 2.2s cubic-bezier(0.4,0,0.6,1) infinite",
        float: "float 4.5s ease-in-out infinite",
        "spin-slow": "spin-slow 12s linear infinite",
        "progress-stripe": "progress-stripe 1s linear infinite",
      },
      transitionTimingFunction: {
        premium: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;