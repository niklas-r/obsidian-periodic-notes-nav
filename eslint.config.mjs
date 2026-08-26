import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
	{ ignores: ["build/", "node_modules/", ".obsidian-cache/", "e2e/vaults/"] },
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		// The plugin runs inside Obsidian, which is a browser environment with a
		// handful of DOM helpers of its own.
		files: ["src/**/*.ts"],
		languageOptions: {
			globals: {
				...globals.browser,
				createEl: "readonly",
				createDiv: "readonly",
				createSpan: "readonly",
				createFragment: "readonly",
			},
		},
	},
	{
		files: ["test/**/*.ts", "e2e/**/*.ts", "wdio.conf.mts"],
		languageOptions: { globals: { ...globals.node, ...globals.browser } },
	},
	{
		// Chai states its assertions as property access: `expect(x).to.be.null`
		// is an expression with no call at the end of it.
		files: ["test/**/*.ts"],
		rules: { "@typescript-eslint/no-unused-expressions": "off" },
	},
	{
		files: ["**/*.mjs"],
		languageOptions: { globals: globals.node },
	},
	{
		rules: {
			// Unused arguments are meaningful in callbacks; an underscore marks
			// the ones that are there on purpose.
			"@typescript-eslint/no-unused-vars": [
				"error",
				{ argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
			],
		},
	},
	prettier
);
