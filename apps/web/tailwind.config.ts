import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Light theme — Arc Scan inspired
        bg: {
          DEFAULT: "#edf0f5", // page canvas — darker than cards so cards pop
          soft: "#f1f5f9",    // inset inside-card panels
          panel: "#ffffff",   // cards sit on canvas
          elevated: "#fafbfc", // emphasis surfaces
        },
        // Semantic text tokens
        primary: "#0f172a",   // near-black headings + data
        secondary: "#475569", // body text
        muted: "#64748b",     // labels, metadata
        subtle: "#94a3b8",    // timestamps, hints
        line: "#e5e7eb",
        "line-strong": "#cbd5e1",
        // Accents — tuned for white bg contrast
        accent: {
          green: "#059669",
          red: "#dc2626",
          yellow: "#d97706",
          blue: "#2563eb",
          purple: "#7c3aed",
          cyan: "#0891b2",
          pink: "#db2777",
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
        display: ['"Inter"', "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        // Soft, Arc Scan-style shadows
        card: "0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)",
        "card-lg": "0 4px 12px rgba(15,23,42,0.08), 0 2px 4px rgba(15,23,42,0.04)",
        glow: "0 1px 4px rgba(37,99,235,0.12)",
        "glow-strong": "0 8px 32px rgba(15,23,42,0.12), 0 2px 8px rgba(15,23,42,0.06)",
        alert: "0 0 0 2px rgba(220,38,38,0.18), 0 4px 16px rgba(220,38,38,0.12)",
        success: "0 0 0 2px rgba(5,150,105,0.15)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "hero-glow":
          "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(37,99,235,0.08), transparent 70%)",
        "blue-fade":
          "linear-gradient(180deg, rgba(37,99,235,0.04) 0%, rgba(37,99,235,0) 100%)",
      },
      animation: {
        "pulse-red": "pulseRed 1.2s ease-in-out",
        "pulse-green": "pulseGreen 1.2s ease-in-out",
        "flash-green": "flashGreen 1.5s ease-out",
        "flash-red": "flashRed 1.5s ease-out",
        "fade-in": "fadeIn 0.4s ease-out",
        "fade-in-up": "fadeInUp 0.5s ease-out",
        "slide-in-right": "slideInRight 0.4s ease-out",
        "scale-in": "scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        shimmer: "shimmer 2s linear infinite",
        "ping-slow": "pingSlow 2.5s cubic-bezier(0, 0, 0.2, 1) infinite",
        "spin-slow": "spin 2s linear infinite",
      },
      keyframes: {
        pulseRed: {
          "0%, 100%": { boxShadow: "0 0 0 rgba(220,38,38,0)" },
          "50%": { boxShadow: "0 0 0 4px rgba(220,38,38,0.2)" },
        },
        pulseGreen: {
          "0%, 100%": { boxShadow: "0 0 0 rgba(5,150,105,0)" },
          "50%": { boxShadow: "0 0 0 4px rgba(5,150,105,0.18)" },
        },
        flashGreen: {
          "0%": { backgroundColor: "rgba(5,150,105,0.12)" },
          "100%": { backgroundColor: "transparent" },
        },
        flashRed: {
          "0%": { backgroundColor: "rgba(220,38,38,0.12)" },
          "100%": { backgroundColor: "transparent" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pingSlow: {
          "75%, 100%": { transform: "scale(2.2)", opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
