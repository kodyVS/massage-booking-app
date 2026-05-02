import type { Config } from "tailwindcss";

/**
 * Tailwind v4 reads its theme primarily from `globals.css` (`@theme` block).
 * This file exists for spec compliance + IDE plugin integration. The brand
 * palette, fonts, and semantic tokens are duplicated here so editor tooling
 * can autocomplete them.
 */
const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        coral: {
          DEFAULT: "#E07A6B",
          dark: "#B85A4D",
        },
        periwinkle: "#A9B8E0",
        blush: "#F4D5CE",
        cream: "#FBF7F4",
        ink: "#2A2D3A",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        serif: ["var(--font-fraunces)", "Georgia", "serif"],
        display: ["var(--font-fraunces)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
