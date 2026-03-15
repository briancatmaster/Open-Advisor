import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        maize: {
          DEFAULT: "#FFCB05",
          50: "#FFFBE6",
          100: "#FFF5BF",
          200: "#FFED80",
          500: "#FFCB05",
          600: "#E6B500",
        },
        umblue: {
          DEFAULT: "#00274C",
          50: "#E6EEF5",
          100: "#CCDDE9",
          200: "#99BBDA",
          500: "#00274C",
          600: "#001F3D",
          700: "#001229",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
