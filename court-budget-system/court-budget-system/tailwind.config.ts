import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#EEF1F6",
          100: "#D6DCE8",
          300: "#8A9AB8",
          500: "#3C4E75",
          700: "#1E2C4C",
          900: "#14213D",
          950: "#0C1626",
        },
        brass: {
          100: "#F2E8D2",
          300: "#D9BE82",
          500: "#A6802A",
          700: "#7A5E1F",
        },
        paper: "#F7F6F2",
        ink: "#2B2E38",
        line: "#E4E1D8",
        good: "#2F6F4E",
        warn: "#9A6A17",
        bad: "#AA4433",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        sm: "3px",
        DEFAULT: "4px",
        md: "6px",
      },
    },
  },
  plugins: [],
};
export default config;
