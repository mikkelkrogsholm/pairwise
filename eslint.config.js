import js from "@eslint/js";
import tseslint from "typescript-eslint";

const commonGlobals = {
  console: "readonly",
  crypto: "readonly",
  File: "readonly",
  Response: "readonly",
  URL: "readonly",
  setTimeout: "readonly",
};

const browserGlobals = {
  document: "readonly",
  fetch: "readonly",
  FormData: "readonly",
  localStorage: "readonly",
  location: "readonly",
  navigator: "readonly",
  window: "readonly",
};

export default [
  {
    ignores: [
      ".claude/**",
      ".codex/**",
      "data/**",
      "graphify-out/**",
      "node_modules/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      globals: {
        ...commonGlobals,
        Bun: "readonly",
        process: "readonly",
      },
    },
  },
  {
    files: ["public/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        ...commonGlobals,
        ...browserGlobals,
      },
    },
  },
  {
    rules: {
      "no-console": "off",
    },
  },
];
