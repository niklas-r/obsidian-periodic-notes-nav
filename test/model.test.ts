import test from "node:test";
import assert from "node:assert/strict";
import { mergeSettings } from "../src/settings";
import { matchPeriodicNote } from "../src/paths";
import { buildNavModel } from "../src/model";

const settings = mergeSettings({
	weekStart: "monday",
	periods: {
		daily: { folder: "Journal", format: "YYYY-MM-DD", label: "dddd" },
		weekly: { folder: "Journal", format: "GGGG-[W]WW", label: "[Week] W" },
		monthly: { folder: "Journal", format: "YYYY-MM", label: "MMMM" },
		quarterly: { folder: "Journal", format: "YYYY-[Q]Q", label: "[Q]Q" },
		yearly: { folder: "Journal", format: "YYYY", label: "YYYY" },
	},
});

const existing = new Set([
	"Journal/2025-09-26.md",
	"Journal/2025-09-25.md",
	"Journal/2025-W39.md",
	"Journal/2025-09.md",
	"Journal/2025-Q3.md",
	"Journal/2025.md",
]);
const exists = (path: string) => existing.has(path);

function modelFor(path: string, overrides = {}) {
	const merged = mergeSettings({ ...settings, ...overrides });
	const match = matchPeriodicNote(path, merged);
	assert.ok(match, `${path} should be a periodic note`);
	return buildNavModel(match, merged, exists);
}

test("a daily note gets breadcrumbs, neighbours and no contents", () => {
	const model = modelFor("Journal/2025-09-26.md");

	assert.deepEqual(
		model.breadcrumbs.map((link) => link.label),
		["2025", "Q3", "September", "Week 39"]
	);
	assert.deepEqual(
		model.breadcrumbs.map((link) => link.exists),
		[true, true, true, true]
	);
	assert.equal(model.current.label, "Friday");
	assert.equal(model.current.isCurrent, true);
	assert.equal(model.previous?.label, "Thursday");
	assert.equal(model.previous?.exists, true);
	assert.equal(model.next?.label, "Saturday");
	assert.equal(model.next?.exists, false);
	assert.deepEqual(model.children, []);
});

test("a weekly note lists its seven days", () => {
	const model = modelFor("Journal/2025-W39.md");
	assert.deepEqual(
		model.children.map((link) => link.label),
		[
			"Monday",
			"Tuesday",
			"Wednesday",
			"Thursday",
			"Friday",
			"Saturday",
			"Sunday",
		]
	);
	assert.deepEqual(
		model.children.filter((link) => link.exists).map((link) => link.path),
		["Journal/2025-09-25.md", "Journal/2025-09-26.md"]
	);
	assert.deepEqual(
		model.breadcrumbs.map((link) => link.label),
		["2025", "Q3", "September"]
	);
});

test("a yearly note has no breadcrumbs and lists its quarters", () => {
	const model = modelFor("Journal/2025.md");
	assert.deepEqual(model.breadcrumbs, []);
	assert.deepEqual(
		model.children.map((link) => link.label),
		["Q1", "Q2", "Q3", "Q4"]
	);
	assert.equal(model.previous?.label, "2024");
	assert.equal(model.next?.label, "2026");
});

test("missing notes can be left out entirely", () => {
	const model = modelFor("Journal/2025-W39.md", { missingNotes: "hidden" });
	assert.deepEqual(
		model.children.map((link) => link.label),
		["Thursday", "Friday"]
	);
	assert.equal(model.next, null);
	assert.equal(model.previous, null);
});

test("disabled periods drop out of the breadcrumbs and the contents row", () => {
	const model = modelFor("Journal/2025-09-26.md", {
		periods: {
			...settings.periods,
			weekly: { ...settings.periods.weekly, enabled: false },
		},
	});
	assert.deepEqual(
		model.breadcrumbs.map((link) => link.label),
		["2025", "Q3", "September"]
	);

	const monthly = modelFor("Journal/2025-09.md", {
		periods: {
			...settings.periods,
			weekly: { ...settings.periods.weekly, enabled: false },
		},
	});
	assert.deepEqual(monthly.children, []);
});

test("rows can be switched off one by one", () => {
	const model = modelFor("Journal/2025-09-26.md", {
		showBreadcrumbs: false,
		showSiblings: false,
	});
	assert.deepEqual(model.breadcrumbs, []);
	assert.equal(model.previous, null);
	assert.equal(model.next, null);
	assert.equal(model.current.label, "Friday");
});
