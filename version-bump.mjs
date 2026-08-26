/**
 * Copies the version in package.json into manifest.json, and records which
 * Obsidian version that release needs in versions.json.
 *
 * Run by the `version` npm lifecycle script, and directly by the release
 * workflow, so the version is read from package.json when npm has not put it
 * in the environment.
 */
import { readFileSync, writeFileSync } from "fs";

const targetVersion =
	process.env.npm_package_version ??
	JSON.parse(readFileSync("package.json", "utf8")).version;

// The manifest carries the version Obsidian shows, and the app version it needs.
const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t") + "\n");

// versions.json tells older Obsidian installs which release they can still use.
const versions = JSON.parse(readFileSync("versions.json", "utf8"));
versions[targetVersion] = minAppVersion;
writeFileSync("versions.json", JSON.stringify(versions, null, "\t") + "\n");
