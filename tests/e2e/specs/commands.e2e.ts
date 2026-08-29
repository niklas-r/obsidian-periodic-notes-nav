import { browser, expect } from "@wdio/globals";
import { describe, it, beforeEach } from "mocha";
import { obsidianPage } from "wdio-obsidian-service";
import {
	PLUGIN_ID,
	activeFilePath,
	fileExists,
	navbar,
	settle,
} from "../helpers";

/** Runs one of the plugin's commands by its unqualified id. */
function run(command: string) {
	return browser.executeObsidianCommand(`${PLUGIN_ID}:${command}`);
}

describe("commands", () => {
	beforeEach(async () => {
		await obsidianPage.resetVault();
		await obsidianPage.openFile("Journal/2025-09-26.md");
	});

	it("opens the previous periodic note", async () => {
		await run("previous-periodic-note");
		await browser.waitUntil(
			async () => (await activeFilePath()) === "Journal/2025-09-25.md"
		);
	});

	it("opens the next periodic note, creating it when it is missing", async () => {
		await run("next-periodic-note");
		await browser.waitUntil(
			async () => (await activeFilePath()) === "Journal/2025-09-27.md"
		);
		expect(await fileExists("Journal/2025-09-27.md")).toBe(true);
	});

	it("opens the parent periodic note", async () => {
		// The nearest enabled parent of a daily note is its week.
		await run("parent-periodic-note");
		await browser.waitUntil(
			async () => (await activeFilePath()) === "Journal/2025-W39.md"
		);
	});

	it("opens today's daily note", async () => {
		await run("open-todays-note");

		await browser.waitUntil(async () =>
			/^Journal\/\d{4}-\d{2}-\d{2}\.md$/.test((await activeFilePath()) ?? "")
		);
		const today = await activeFilePath();
		expect(await fileExists(today!)).toBe(true);
	});

	it("toggles the navigation bar off and back on", async () => {
		await expect(navbar()).toExist();

		await run("toggle-navbar");
		await settle();
		await expect(navbar()).not.toExist();

		await run("toggle-navbar");
		await expect(navbar()).toExist();
	});
});
