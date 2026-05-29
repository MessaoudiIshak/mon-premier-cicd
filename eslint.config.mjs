import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  { 
    files: ["**/*.{js,mjs,cjs}"], 
    plugins: { js }, 
    extends: ["js/recommended"], 
    languageOptions: { 
      globals: {
        ...globals.browser,
        ...globals.node // 👈 THIS LINE RIGHT HERE tells ESLint that 'process' is totally fine!
      } 
    } 
  },
  { files: ["**/*.js"], languageOptions: { sourceType: "commonjs" } },
  { files: ["**/__tests__/**/*.js", "**/*.test.js"], languageOptions: { globals: globals.jest } },
]);