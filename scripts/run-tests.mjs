import { rmSync, mkdirSync, readdirSync } from "fs";
import { spawnSync } from "child_process";
import esbuild from "esbuild";

const outdir = "build/test";
rmSync(outdir, { recursive: true, force: true });
mkdirSync(outdir, { recursive: true });

const entryPoints = readdirSync("test")
	.filter((name) => name.endsWith(".test.ts"))
	.map((name) => `test/${name}`);

await esbuild.build({
	entryPoints,
	outdir,
	bundle: true,
	platform: "node",
	format: "esm",
	target: "node18",
	sourcemap: "inline",
	// Resolved by node at run time instead of being bundled into the tests.
	external: ["jsdom"],
	// The plugin talks to Obsidian; the tests talk to a stub of it.
	alias: { obsidian: "./test/stubs/obsidian.ts" },
});

const bundles = readdirSync(outdir)
	.filter((name) => name.endsWith(".test.js"))
	.map((name) => `${outdir}/${name}`);

const result = spawnSync("node", ["--test", ...bundles], { stdio: "inherit" });
process.exit(result.status ?? 1);
