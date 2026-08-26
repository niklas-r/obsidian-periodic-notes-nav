import { rmSync, mkdirSync, readdirSync } from "fs";
import { spawnSync } from "child_process";
import esbuild from "esbuild";

const outdir = "build/test";
rmSync(outdir, { recursive: true, force: true });
mkdirSync(outdir, { recursive: true });

const specs = readdirSync("test")
	.filter((name) => name.endsWith(".test.ts"))
	.map((name) => `test/${name}`);

await esbuild.build({
	// setup.ts patches the DOM helpers onto jsdom and is loaded first by Mocha.
	entryPoints: ["test/setup.ts", ...specs],
	outdir,
	bundle: true,
	platform: "node",
	format: "esm",
	target: "node18",
	sourcemap: "inline",
	// Resolved by node at run time instead of being bundled into the tests.
	// Mocha in particular must stay external: it is CommonJS and breaks when
	// esbuild inlines it into an ESM bundle.
	external: ["jsdom", "mocha", "chai"],
	// The plugin talks to Obsidian; the tests talk to a stub of it.
	alias: { obsidian: "./test/stubs/obsidian.ts" },
});

const bundles = readdirSync(outdir)
	.filter((name) => name.endsWith(".test.js"))
	.map((name) => `${outdir}/${name}`);

const mocha = process.platform === "win32" ? "mocha.cmd" : "mocha";
const result = spawnSync(
	`node_modules/.bin/${mocha}`,
	["--file", `${outdir}/setup.js`, ...bundles],
	{ stdio: "inherit" }
);
process.exit(result.status ?? 1);
