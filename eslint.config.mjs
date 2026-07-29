import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // aggregator/ - окремий Vite-проєкт зі своїм package.json/tsconfig/lint-конфігом
  // (standalone-білд для агрегаторів), не частина цього Next.js застосунку.
  { ignores: ["aggregator/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
