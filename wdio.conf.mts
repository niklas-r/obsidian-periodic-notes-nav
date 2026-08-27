import * as path from "path";
import { env } from "process";
import { parseObsidianVersions } from "wdio-obsidian-service";

// wdio-obsidian-service downloads Obsidian builds into this directory. CI
// restores it from the actions cache; see .github/workflows/e2e.yml.
const cacheDir = path.resolve(".obsidian-cache");

// "appVersion/installerVersion" pairs. "earliest" resolves to this plugin's
// minAppVersion in manifest.json, so the oldest Obsidian we claim to support
// is tested alongside the newest. Override with OBSIDIAN_VERSIONS to test a
// specific pair.
const versions = await parseObsidianVersions(
	env.OBSIDIAN_VERSIONS ?? "earliest/earliest latest/latest",
	{ cacheDir }
);

if (env.CI) {
	// Read by the workflow to key the Obsidian cache on the resolved versions.
	console.log("obsidian-cache-key:", JSON.stringify(versions));
}

export const config: WebdriverIO.Config = {
	runner: "local",
	framework: "mocha",

	specs: ["./tests/e2e/specs/**/*.e2e.ts"],

	maxInstances: Number(env.WDIO_MAX_INSTANCES || 4),

	capabilities: versions.map<WebdriverIO.Capabilities>(
		([appVersion, installerVersion]) => ({
			browserName: "obsidian",
			"wdio:obsidianOptions": {
				appVersion,
				installerVersion,
				// esbuild writes main.js, manifest.json and styles.css here, so
				// `npm run build` has to run before wdio. See the test:e2e script.
				plugins: ["./build"],
				// Specs that need the other vault call browser.reloadObsidian().
				vault: "tests/e2e/vaults/periodic",
			},
		})
	),

	services: ["obsidian"],
	// A wrapper around spec-reporter that reports the Obsidian version rather
	// than the underlying Chromium one.
	reporters: ["obsidian"],

	mochaOpts: {
		ui: "bdd",
		timeout: 60 * 1000,
	},

	waitforInterval: 250,
	waitforTimeout: 5 * 1000,
	logLevel: "warn",

	cacheDir,

	// describe/it/expect are imported explicitly, matching the unit tests.
	injectGlobals: false,
};
