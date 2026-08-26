import { describe, it } from "mocha";
import { expect } from "chai";
import moment from "moment";
import { mergeSettings, type PeriodicNavSettings } from "../src/settings";
import {
	applyTemplate,
	matchPeriodicNote,
	noteLabel,
	notePath,
	resolveFolder,
} from "../src/paths";

function settingsWith(
	overrides: Partial<PeriodicNavSettings> = {}
): PeriodicNavSettings {
	return mergeSettings({
		periods: {
			daily: { folder: "Journal/{{date:YYYY}}/{{date:MM}}" },
			weekly: { folder: "Journal/{{date:YYYY}}/Weeks", format: "GGGG-[W]WW" },
			monthly: { folder: "Journal/{{date:YYYY}}" },
			quarterly: { folder: "Journal/{{date:YYYY}}" },
			yearly: { folder: "Journal" },
		},
		...overrides,
	});
}

describe("paths", () => {
	it("folder placeholders are filled in from the note's date", () => {
		const date = moment("2025-09-26", "YYYY-MM-DD");
		expect(resolveFolder("Journal/{{date:YYYY}}/{{date:MM}}", date)).to.equal(
			"Journal/2025/09"
		);
		expect(resolveFolder("Journal/{{ date : YYYY }}", date)).to.equal(
			"Journal/2025"
		);
		expect(resolveFolder("{{date}}", date)).to.equal("2025-09-26");
		expect(resolveFolder("/Journal//Daily/", date)).to.equal("Journal/Daily");
		expect(resolveFolder("", date)).to.equal("");
	});

	it("note paths follow the configured folder and file name format", () => {
		const settings = settingsWith();
		const date = moment("2025-09-26", "YYYY-MM-DD");
		expect(notePath("daily", date, settings)).to.equal(
			"Journal/2025/09/2025-09-26.md"
		);
		expect(notePath("monthly", date, settings)).to.equal(
			"Journal/2025/2025-09.md"
		);
		expect(notePath("quarterly", date, settings)).to.equal(
			"Journal/2025/2025-Q3.md"
		);
		expect(notePath("yearly", date, settings)).to.equal("Journal/2025.md");
		expect(notePath("weekly", date, settings)).to.equal(
			"Journal/2025/Weeks/2025-W39.md"
		);
	});

	it("a week that starts in the previous year is filed under the year it belongs to", () => {
		const settings = settingsWith();
		// Week 1 of 2025 starts on 30 December 2024.
		const week = moment("2025-W01", "GGGG-[W]WW");
		expect(notePath("weekly", week, settings)).to.equal(
			"Journal/2025/Weeks/2025-W01.md"
		);
		expect(
			notePath("weekly", moment("2024-12-31", "YYYY-MM-DD"), settings)
		).to.equal("Journal/2025/Weeks/2025-W01.md");
	});

	it("notes in the vault root need no folder", () => {
		const settings = mergeSettings({});
		expect(
			notePath("daily", moment("2025-09-26", "YYYY-MM-DD"), settings)
		).to.equal("2025-09-26.md");
	});

	it("labels use the label format, falling back to the file name format", () => {
		const settings = settingsWith();
		const date = moment("2025-09-26", "YYYY-MM-DD");
		expect(noteLabel("daily", date, settings)).to.equal("Friday");
		expect(noteLabel("monthly", date, settings)).to.equal("September");
		expect(noteLabel("quarterly", date, settings)).to.equal("Q3");
		expect(noteLabel("yearly", date, settings)).to.equal("2025");

		const noLabel = settingsWith();
		noLabel.periods.daily.label = "";
		expect(noteLabel("daily", date, noLabel)).to.equal("2025-09-26");
	});

	it("periodic notes are recognised by their path and file name together", () => {
		const settings = settingsWith();

		const daily = matchPeriodicNote("Journal/2025/09/2025-09-26.md", settings);
		expect(daily?.key).to.equal("daily");
		expect(daily?.date.format("YYYY-MM-DD")).to.equal("2025-09-26");

		expect(
			matchPeriodicNote("Journal/2025/Weeks/2025-W39.md", settings)?.key
		).to.equal("weekly");
		expect(
			matchPeriodicNote("Journal/2025/2025-09.md", settings)?.key
		).to.equal("monthly");
		expect(
			matchPeriodicNote("Journal/2025/2025-Q3.md", settings)?.key
		).to.equal("quarterly");
		expect(matchPeriodicNote("Journal/2025.md", settings)?.key).to.equal(
			"yearly"
		);
	});

	it("notes outside the configured folder are left alone", () => {
		const settings = settingsWith();
		expect(matchPeriodicNote("Inbox/2025-09-26.md", settings)).to.equal(null);
		expect(
			matchPeriodicNote("Journal/2025/08/2025-09-26.md", settings)
		).to.equal(null);
		expect(
			matchPeriodicNote("Journal/2025/09/Groceries.md", settings)
		).to.equal(null);
		expect(
			matchPeriodicNote("Journal/2025/09/2025-09-26.canvas", settings)
		).to.equal(null);
		// A date that does not exist must not be read as a periodic note.
		expect(
			matchPeriodicNote("Journal/2025/02/2025-02-31.md", settings)
		).to.equal(null);
		// Sloppy dates are not accepted either, the format is matched strictly.
		expect(matchPeriodicNote("Journal/2025/09/2025-9-6.md", settings)).to.equal(
			null
		);
	});

	it("disabled periods are never matched", () => {
		const settings = settingsWith();
		settings.periods.daily.enabled = false;
		expect(
			matchPeriodicNote("Journal/2025/09/2025-09-26.md", settings)
		).to.equal(null);
		expect(
			matchPeriodicNote("Journal/2025/2025-09.md", settings)?.key
		).to.equal("monthly");
	});

	it("templates fill in title, date and time placeholders", () => {
		const date = moment("2025-09-26", "YYYY-MM-DD");
		const now = moment("2025-09-26 08:15", "YYYY-MM-DD HH:mm");
		const content = applyTemplate(
			"# {{title}}\n\nWritten {{date:dddd, D MMMM YYYY}} at {{time}}.\nPlain: {{date}}",
			date,
			"2025-09-26",
			now
		);
		expect(content).to.equal(
			"# 2025-09-26\n\nWritten Friday, 26 September 2025 at 08:15.\nPlain: 2025-09-26"
		);
	});
});
