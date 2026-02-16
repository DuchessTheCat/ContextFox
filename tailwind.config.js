import tailwindcssAnimate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./frontend/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#020617",
        foreground: "#f8fafc",
        card: "rgba(15, 23, 42, 0.8)",
        "card-foreground": "#f8fafc",
        primary: "#f8fafc",
        "primary-foreground": "#0f172a",
        secondary: "rgba(30, 41, 59, 0.7)",
        "secondary-foreground": "#f8fafc",
        muted: "rgba(30, 41, 59, 0.5)",
        "muted-foreground": "#94a3b8",
        accent: "#334155",
        "accent-foreground": "#f8fafc",
        destructive: "#ef4444",
        "destructive-foreground": "#ffffff",
        border: "#1e293b",
        input: "#0f172a",
        ring: "#94a3b8",
      },
      backdropBlur: {
        xs: '2px',
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
      },
    },
  },
  plugins: [
    tailwindcssAnimate,
  ],
}
