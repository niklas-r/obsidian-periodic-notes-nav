import test from "node:test";
import assert from "node:assert/strict";
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

test("folder placeholders are filled in from the note's date", () => {
	const date = moment("2025-09-26", "YYYY-MM-DD");
	assert.equal(
		resolveFolder("Journal/{{date:YYYY}}/{{date:MM}}", date),
		"Journal/2025/09"
	);
	assert.equal(
		resolveFolder("Journal/{{ date : YYYY }}", date),
		"Journal/2025"
	);
	assert.equal(resolveFolder("{{date}}", date), "2025-09-26");
	assert.equal(resolveFolder("/Journal//Daily/", date), "Journal/Daily");
	assert.equal(resolveFolder("", date), "");
});

test("note paths follow the configured folder and file name format", () => {
	const settings = settingsWith();
	const date = moment("2025-09-26", "YYYY-MM-DD");
	assert.equal(
		notePath("daily", date, settings),
		"Journal/2025/09/2025-09-26.md"
	);
	assert.equal(notePath("monthly", date, settings), "Journal/2025/2025-09.md");
	assert.equal(
		notePath("quarterly", date, settings),
		"Journal/2025/2025-Q3.md"
	);
	assert.equal(notePath("yearly", date, settings), "Journal/2025.md");
	assert.equal(
		notePath("weekly", date, settings),
		"Journal/2025/Weeks/2025-W39.md"
	);
});

test("a week that starts in the previous year is filed under the year it belongs to", () => {
	const settings = settingsWith();
	// Week 1 of 2025 starts on 30 December 2024.
	const week = moment("2025-W01", "GGGG-[W]WW");
	assert.equal(
		notePath("weekly", week, settings),
		"Journal/2025/Weeks/2025-W01.md"
	);
	assert.equal(
		notePath("weekly", moment("2024-12-31", "YYYY-MM-DD"), settings),
		"Journal/2025/Weeks/2025-W01.md"
	);
});

test("notes in the vault root need no folder", () => {
	const settings = mergeSettings({});
	assert.equal(
		notePath("daily", moment("2025-09-26", "YYYY-MM-DD"), settings),
		"2025-09-26.md"
	);
});

test("labels use the label format, falling back to the file name format", () => {
	const settings = settingsWith();
	const date = moment("2025-09-26", "YYYY-MM-DD");
	assert.equal(noteLabel("daily", date, settings), "Friday");
	assert.equal(noteLabel("monthly", date, settings), "September");
	assert.equal(noteLabel("quarterly", date, settings), "Q3");
	assert.equal(noteLabel("yearly", date, settings), "2025");

	const noLabel = settingsWith();
	noLabel.periods.daily.label = "";
	assert.equal(noteLabel("daily", date, noLabel), "2025-09-26");
});

test("periodic notes are recognised by their path and file name together", () => {
	const settings = settingsWith();

	const daily = matchPeriodicNote("Journal/2025/09/2025-09-26.md", settings);
	assert.equal(daily?.key, "daily");
	assert.equal(daily?.date.format("YYYY-MM-DD"), "2025-09-26");

	assert.equal(
		matchPeriodicNote("Journal/2025/Weeks/2025-W39.md", settings)?.key,
		"weekly"
	);
	assert.equal(
		matchPeriodicNote("Journal/2025/2025-09.md", settings)?.key,
		"monthly"
	);
	assert.equal(
		matchPeriodicNote("Journal/2025/2025-Q3.md", settings)?.key,
		"quarterly"
	);
	assert.equal(matchPeriodicNote("Journal/2025.md", settings)?.key, "yearly");
});

test("notes outside the configured folder are left alone", () => {
	const settings = settingsWith();
	assert.equal(matchPeriodicNote("Inbox/2025-09-26.md", settings), null);
	assert.equal(
		matchPeriodicNote("Journal/2025/08/2025-09-26.md", settings),
		null
	);
	assert.equal(
		matchPeriodicNote("Journal/2025/09/Groceries.md", settings),
		null
	);
	assert.equal(
		matchPeriodicNote("Journal/2025/09/2025-09-26.canvas", settings),
		null
	);
	// A date that does not exist must not be read as a periodic note.
	assert.equal(
		matchPeriodicNote("Journal/2025/02/2025-02-31.md", settings),
		null
	);
	// Sloppy dates are not accepted either, the format is matched strictly.
	assert.equal(
		matchPeriodicNote("Journal/2025/09/2025-9-6.md", settings),
		null
	);
});

test("disabled periods are never matched", () => {
	const settings = settingsWith();
	settings.periods.daily.enabled = false;
	assert.equal(
		matchPeriodicNote("Journal/2025/09/2025-09-26.md", settings),
		null
	);
	assert.equal(
		matchPeriodicNote("Journal/2025/2025-09.md", settings)?.key,
		"monthly"
	);
});

test("templates fill in title, date and time placeholders", () => {
	const date = moment("2025-09-26", "YYYY-MM-DD");
	const now = moment("2025-09-26 08:15", "YYYY-MM-DD HH:mm");
	const content = applyTemplate(
		"# {{title}}\n\nWritten {{date:dddd, D MMMM YYYY}} at {{time}}.\nPlain: {{date}}",
		date,
		"2025-09-26",
		now
	);
	assert.equal(
		content,
		"# 2025-09-26\n\nWritten Friday, 26 September 2025 at 08:15.\nPlain: 2025-09-26"
	);
});
