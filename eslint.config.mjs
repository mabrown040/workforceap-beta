import nextVitals from "eslint-config-next/core-web-vitals";
import tseslint from "typescript-eslint";

const NO_BARE_TABLE_MESSAGE =
  "Do not render bare <table> in product code. Use the shared <DataTable> from components/portal/ui/DataTable instead so we get consistent column hiding (hideOnMobile), horizontal scroll, density, and admin-table styling. The only exception is the DataTable implementation itself in components/portal/ui/.";

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
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    ignores: [
      // The DataTable implementation legitimately renders <table>.
      "components/portal/ui/DataTable.tsx",
      // Tests and stories may exercise table markup directly.
      "**/*.test.{ts,tsx}",
      "**/*.stories.{ts,tsx}",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXOpeningElement[name.name='table']",
          message: NO_BARE_TABLE_MESSAGE,
        },
      ],
    },
  },
];

export default config;
