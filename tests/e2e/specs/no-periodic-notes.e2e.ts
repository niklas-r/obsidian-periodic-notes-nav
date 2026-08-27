import { browser, expect } from "@wdio/globals";
import { describe, it, before, beforeEach } from "mocha";
import { obsidianPage } from "wdio-obsidian-service";
import { PLUGIN_ID, activeFilePath, navbar, settle } from "../helpers";

describe("a vault with no periodic notes", () => {
	before(async () => {
		// A full reboot, because this spec needs a different vault than the one
		// the other specs run against.
		await browser.reloadObsidian({ vault: "tests/e2e/vaults/plain" });
	});

	beforeEach(async () => {
		await obsidianPage.resetVault();
	});

	it("still loads the plugin", async () => {
		// Without this the rest of the file would pass even if the plugin were
		// never installed.
		const loaded = await browser.executeObsidian(
			({ app }, id) =>
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				!!(app as any).plugins.plugins[id],
			PLUGIN_ID
		);
		expect(loaded).toBe(true);
	});

	it("shows no bar on a note in the vault root", async () => {
		await obsidianPage.openFile("Welcome.md");

		expect(await activeFilePath()).toBe("Welcome.md");
		await settle();
		await expect(navbar()).not.toExist();
	});

	it("shows no bar on a note in a folder", async () => {
		await obsidianPage.openFile("Notes/Meeting.md");

		expect(await activeFilePath()).toBe("Notes/Meeting.md");
		await settle();
		await expect(navbar()).not.toExist();
	});

	it("puts no bar anywhere in the workspace", async () => {
		await obsidianPage.openFile("Notes/Groceries.md");
		await settle();

		expect(await browser.$$(".pnn-navbar").length).toBe(0);
	});
});
