import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import noRawDesignValues from "./lint/no-raw-design-values.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  { linterOptions: { reportUnusedDisableDirectives: "error" } },
  {
    files: ["src/**/*.{js,jsx,mjs,ts,tsx}"],
    plugins: { arandu: { rules: { "no-raw-design-values": noRawDesignValues } } },
    rules: { "arandu/no-raw-design-values": "error" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // The Draco decoder is copied as is from three.js (three/examples/jsm/libs/draco/gltf).
    "public/draco/**",
  ]),
]);

export default eslintConfig;
