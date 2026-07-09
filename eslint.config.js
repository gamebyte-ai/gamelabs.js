import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    ignores: ["dist/", "node_modules/", "examples/", "scripts/"],
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/consistent-type-imports": "error",
      "no-console": "warn",
    },
  },
  {
    files: ["src/**/*.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/FbPlayableAd|mraid|Mintegral|AdMob|ExitApi|PokiSDK|ysdk|CrazyGames/i]",
          message: "gamelabs.js/src/ must not reference network SDK names — the coupling invariant requires network-agnostic core. Adapter code lives in playable_builder shims or portal integration snippets.",
        },
        {
          selector: "TemplateElement[value.raw=/FbPlayableAd|mraid|Mintegral|AdMob|ExitApi|PokiSDK|ysdk|CrazyGames/i]",
          message: "gamelabs.js/src/ must not reference network SDK names in template literals either.",
        },
      ],
    },
  },
);
