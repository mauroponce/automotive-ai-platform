import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
export default defineConfig([...nextVitals, globalIgnores([".next/**", "public/ort/**", "dist/**", "node_modules/**", "playwright-report/**"])]);
