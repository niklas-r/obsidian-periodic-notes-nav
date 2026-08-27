import { browser, expect } from "@wdio/globals";
import { describe, it, beforeEach } from "mocha";
import { obsidianPage } from "wdio-obsidian-service";
import { activeFilePath, fileExists, labels, navbar } from "../helpers";

describe("navigation bar", () => {
	beforeEach(async () => {
		// Restores the notes a previous test created or deleted, without the
		// cost of rebooting Obsidian.
		await obsidianPage.resetVault();
	});

	it("renders a bar for a daily note, listing its parents as breadcrumbs", async () => {
		await obsidianPage.openFile("Journal/2025-09-26.md");

		const bar = navbar();
		await expect(bar).toExist();
		await expect(bar).toHaveAttribute("data-period", "daily");

		expect(await labels(".pnn-breadcrumbs .pnn-item .pnn-label")).toEqual([
			"2025",
			"Q3",
			"September",
			"Week 39",
		]);
	});

	it("marks the open note as current rather than linking to it", async () => {
		await obsidianPage.openFile("Journal/2025-09-26.md");

		const current = navbar().$(".pnn-current");
		await expect(current).toExist();
		await expect(current).toHaveAttribute("aria-current", "page");
		await expect(current.$(".pnn-label")).toHaveText("Friday");
	});

	it("marks a note that does not exist yet as missing", async () => {
		await obsidianPage.openFile("Journal/2025-09-26.md");

		// 2025-09-25 is in the vault, 2025-09-27 deliberately is not.
		await expect(
			navbar().$('.pnn-link[data-path="Journal/2025-09-25.md"]')
		).not.toHaveElementClass("pnn-missing");
		await expect(
			navbar().$('.pnn-link[data-path="Journal/2025-09-27.md"]')
		).toHaveElementClass("pnn-missing");
	});

	it("opens the note behind a link when it is clicked", async () => {
		await obsidianPage.openFile("Journal/2025-09-26.md");

		await navbar().$('.pnn-link[data-path="Journal/2025-09-25.md"]').click();

		await browser.waitUntil(
			async () => (await activeFilePath()) === "Journal/2025-09-25.md"
		);
		// The bar follows the new note rather than going stale.
		await expect(navbar().$(".pnn-current .pnn-label")).toHaveText("Thursday");
	});

	it("creates the note behind a missing link when it is clicked", async () => {
		await obsidianPage.openFile("Journal/2025-09-26.md");
		expect(await fileExists("Journal/2025-09-27.md")).toBe(false);

		await navbar().$('.pnn-link[data-path="Journal/2025-09-27.md"]').click();

		await browser.waitUntil(
			async () => (await activeFilePath()) === "Journal/2025-09-27.md"
		);
		expect(await fileExists("Journal/2025-09-27.md")).toBe(true);
	});

	it("lists the seven days of a weekly note in the contents row", async () => {
		await obsidianPage.openFile("Journal/2025-W39.md");

		await expect(navbar()).toHaveAttribute("data-period", "weekly");
		expect(await labels(".pnn-children .pnn-item .pnn-label")).toEqual([
			"Monday",
			"Tuesday",
			"Wednesday",
			"Thursday",
			"Friday",
			"Saturday",
			"Sunday",
		]);
		expect(await labels(".pnn-breadcrumbs .pnn-item .pnn-label")).toEqual([
			"2025",
			"Q3",
			"September",
		]);
	});

	it("leaves a normal note alone", async () => {
		await obsidianPage.openFile("Notes/Groceries.md");

		await expect(await activeFilePath()).toBe("Notes/Groceries.md");
		await expect(navbar()).not.toExist();
	});
});
