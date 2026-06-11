import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#F25A16",
          dark: "#D9470B",
          green: "#25B768",
          ink: "#111827",
          cream: "#FFF8F2",
        },
      },
      boxShadow: {
        card: "0 20px 60px rgba(17, 24, 39, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
