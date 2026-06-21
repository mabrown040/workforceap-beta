import { FlatCompat } from "@eslint/eslintrc";
import tseslint from "typescript-eslint";
import path from "node:path";
import { fileURLToPath } from "node:url";

// eslint-config-next@15.x ships a legacy (eslintrc) config object, not a flat
// config array. FlatCompat bridges it into the flat config used below.
const compat = new FlatCompat({
  baseDirectory: path.dirname(fileURLToPath(import.meta.url)),
});
const nextVitals = compat.extends("next/core-web-vitals");

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
      // Design-kit DataTable: warm/dense token-driven table implementation
      // (Phase 0 portal redesign). Sibling to the ui/ one; renders <table> by design.
      "components/portal/kit/DataTable.tsx",
      // Legacy admin UIs still use raw tables; migrate to <DataTable> over time.
      // 2026-05-20: each retained <table> now carries a <caption className="sr-only"> for a11y.
      "app/admin/placement-surveys/page.tsx",
      "app/admin/growth/page.tsx",
      "app/admin/reports/quarterly-outcomes/QuarterlyOutcomesClient.tsx",
      "app/privacy/page.tsx",
      "components/admin/B4BProgramsListButton.tsx",
      "components/admin/IgnoredXapiSummaryCard.tsx",
      "components/admin/TestimonialsAdminClient.tsx",
      "components/admin/TrainingProgressClient.tsx",
      "components/employer/JobApplicantsClient.tsx",
      "components/portal/counselor/CounselorPriorityQueue.tsx",
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
  {
    // High-signal jsx-a11y baseline. Intentionally narrower than the
    // upstream `recommended` set so we do not drown the team in errors.
    // The `jsx-a11y` plugin itself is already registered by
    // `eslint-config-next/core-web-vitals`, so we only override rules here
    // (re-declaring the plugin would error: "Cannot redefine plugin").
    // Tighten / expand in follow-up PRs.
    files: ["**/*.{tsx,jsx}"],
    rules: {
      "jsx-a11y/alt-text": "error",
      "jsx-a11y/anchor-has-content": "error",
      "jsx-a11y/anchor-is-valid": "error",
      "jsx-a11y/aria-props": "error",
      "jsx-a11y/aria-proptypes": "error",
      "jsx-a11y/aria-role": "error",
      "jsx-a11y/aria-unsupported-elements": "error",
      "jsx-a11y/role-has-required-aria-props": "error",
      "jsx-a11y/role-supports-aria-props": "error",
      "jsx-a11y/heading-has-content": "error",
      // High false-positive rate on custom <Label> wrappers; surface but
      // do not block CI.
      "jsx-a11y/label-has-associated-control": "warn",
      "jsx-a11y/no-redundant-roles": "error",
      "jsx-a11y/scope": "error",
    },
  },
];

export default config;
