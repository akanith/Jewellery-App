import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          50: "#fffdf0",
          100: "#fefab8",
          200: "#fdf480",
          300: "#fbe848",
          400: "#f9d61c",
          500: "#d9ae0b",
          600: "#b38505",
          700: "#8c6003",
          800: "#6f4807",
          900: "#5d3b0c",
        },
        slate: {
          850: "#131e32",
          950: "#0b1120",
        }
      },
    },
  },
  plugins: [],
};
export default config;
