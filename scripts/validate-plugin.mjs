/**
 * Checks the metadata that decides whether a release installs cleanly:
 * the three version numbers agree, and manifest.json holds everything
 * Obsidian expects of a community plugin.
 *
 * Pass `--tag <version>` to also assert that a release tag matches the
 * manifest, which is what the release workflow does.
 */
import { readFileSync } from "fs";

const SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z-.]+)?$/;
const PLUGIN_ID = /^[a-z0-9-]+$/;

const errors = [];
const warnings = [];

const error = (message) => errors.push(message);
const warn = (message) => warnings.push(message);

function readJson(file) {
	try {
		return JSON.parse(readFileSync(file, "utf8"));
	} catch (cause) {
		error(`${file} could not be read: ${cause.message}`);
		return null;
	}
}

const manifest = readJson("manifest.json");
const pkg = readJson("package.json");
const versions = readJson("versions.json");

// --- manifest.json -------------------------------------------------------

if (manifest) {
	const required = {
		id: "string",
		name: "string",
		version: "string",
		minAppVersion: "string",
		description: "string",
		author: "string",
		isDesktopOnly: "boolean",
	};

	for (const [field, type] of Object.entries(required)) {
		if (manifest[field] === undefined) {
			error(`manifest.json is missing "${field}"`);
		} else if (typeof manifest[field] !== type) {
			error(`manifest.json "${field}" should be a ${type}`);
		}
	}

	if (typeof manifest.id === "string") {
		if (!PLUGIN_ID.test(manifest.id)) {
			error(
				`manifest.json "id" should only hold lowercase letters, digits and hyphens, got "${manifest.id}"`
			);
		}
		if (manifest.id.includes("obsidian")) {
			error(`manifest.json "id" should not contain "obsidian"`);
		}
		if (manifest.id.endsWith("-plugin")) {
			warn(`manifest.json "id" does not need the "-plugin" suffix`);
		}
	}

	if (typeof manifest.name === "string" && /obsidian/i.test(manifest.name)) {
		error(`manifest.json "name" should not contain "Obsidian"`);
	}

	for (const field of ["version", "minAppVersion"]) {
		const value = manifest[field];
		if (typeof value === "string" && !SEMVER.test(value)) {
			error(
				`manifest.json "${field}" should be a semantic version like 1.2.3, got "${value}"`
			);
		}
	}

	if (typeof manifest.description === "string") {
		if (manifest.description.length > 250) {
			error(
				`manifest.json "description" is ${manifest.description.length} characters, the limit is 250`
			);
		}
		if (!manifest.description.endsWith(".")) {
			warn(`manifest.json "description" should end with a full stop`);
		}
		if (/^this plugin/i.test(manifest.description)) {
			warn(
				`manifest.json "description" reads better without the "This plugin…" opening`
			);
		}
	}

	if (
		manifest.fundingUrl !== undefined &&
		typeof manifest.fundingUrl !== "string" &&
		typeof manifest.fundingUrl !== "object"
	) {
		error(`manifest.json "fundingUrl" should be a string or an object`);
	}
}

// --- versions agree ------------------------------------------------------

const version = manifest?.version;

if (manifest && pkg && pkg.version !== version) {
	error(
		`package.json is at ${pkg.version} but manifest.json is at ${version}; run "npm version" to move them together`
	);
}

if (manifest && versions) {
	const minAppVersion = versions[version];
	if (minAppVersion === undefined) {
		error(
			`versions.json has no entry for ${version}; it tells older Obsidian versions which release to install`
		);
	} else if (minAppVersion !== manifest.minAppVersion) {
		error(
			`versions.json maps ${version} to Obsidian ${minAppVersion} but manifest.json requires ${manifest.minAppVersion}`
		);
	}
}

// --- the release tag, when there is one ----------------------------------

const tagIndex = process.argv.indexOf("--tag");
if (tagIndex !== -1) {
	const tag = process.argv[tagIndex + 1]?.replace(/^v/, "");
	if (!tag) {
		error(`--tag was given without a version`);
	} else if (tag !== version) {
		error(
			`the tag is ${tag} but manifest.json is at ${version}; tag the commit that carries the release version`
		);
	}
}

// --- report --------------------------------------------------------------

for (const message of warnings) console.warn(`warning: ${message}`);
for (const message of errors) console.error(`error: ${message}`);

if (errors.length) {
	console.error(
		`\n${errors.length} problem${errors.length === 1 ? "" : "s"} found.`
	);
	process.exit(1);
}

console.log(
	`manifest.json, package.json and versions.json all agree on ${version}.`
);
