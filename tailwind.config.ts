import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1C1C1A",
        paper: "#F0EEEB",
        green: "#A5D900",
        border: "#D4D0CA",
        muted: "#8A8680",
        elevated: "#363530",
        dark: "#1E1D1B",
        amber: "#C4872E",
        copper: "#A0694A",
        alert: "#D95B2F",
      },
      fontFamily: {
        sans: ['"DM Sans"', "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      borderRadius: {
        card: "6px",
      },
    },
  },
  plugins: [],
};
export default config;
