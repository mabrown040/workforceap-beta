import nextVitals from "eslint-config-next/core-web-vitals";
import tseslint from "typescript-eslint";

const config = [
  {
    ignores: [".next/**", "node_modules/**"],
  },
  ...nextVitals,
  tseslint.configs.base,
  {
    rules: {
      // Start with a non-interactive lint gate that reflects today's codebase.
      // Tighten these rules in follow-up PRs instead of blocking CI adoption.
      "@next/next/no-html-link-for-pages": "off",
      "react/no-unescaped-entities": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
      "react-hooks/error-boundaries": "off",
      "react-hooks/rules-of-hooks": "off",
    },
  },
];

export default config;
