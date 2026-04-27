import eslintPluginJsxA11y from "eslint-plugin-jsx-a11y";
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    plugins: {
      "jsx-a11y": eslintPluginJsxA11y
    },
    rules: {
      "jsx-a11y/no-noninteractive-element-interactions": "off",
      "jsx-a11y/click-events-have-key-events": "off",
      "jsx-a11y/interactive-supports-focus": "off"
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: true
      }
    },
    files: ["app/**/*.tsx", "components/**/*.tsx"],
  }
);
