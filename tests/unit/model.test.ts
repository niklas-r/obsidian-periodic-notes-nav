import { describe, it } from "mocha";
import { expect } from "chai";
import { assertExists } from "./helpers";
import { mergeSettings } from "../../src/settings";
import { matchPeriodicNote } from "../../src/paths";
import { buildNavModel } from "../../src/model";

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
	assertExists(match, `${path} should be a periodic note`);
	return buildNavModel(match, merged, exists);
}

describe("nav model", () => {
	it("a daily note gets breadcrumbs, neighbours and no contents", () => {
		const model = modelFor("Journal/2025-09-26.md");

		expect(model.breadcrumbs.map((link) => link.label)).to.deep.equal([
			"2025",
			"Q3",
			"September",
			"Week 39",
		]);
		expect(model.breadcrumbs.map((link) => link.exists)).to.deep.equal([
			true,
			true,
			true,
			true,
		]);
		expect(model.current.label).to.equal("Friday");
		expect(model.current.isCurrent).to.equal(true);
		expect(model.previous?.label).to.equal("Thursday");
		expect(model.previous?.exists).to.equal(true);
		expect(model.next?.label).to.equal("Saturday");
		expect(model.next?.exists).to.equal(false);
		expect(model.children).to.deep.equal([]);
	});

	it("a weekly note lists its seven days", () => {
		const model = modelFor("Journal/2025-W39.md");
		expect(model.children.map((link) => link.label)).to.deep.equal([
			"Monday",
			"Tuesday",
			"Wednesday",
			"Thursday",
			"Friday",
			"Saturday",
			"Sunday",
		]);
		expect(
			model.children.filter((link) => link.exists).map((link) => link.path)
		).to.deep.equal(["Journal/2025-09-25.md", "Journal/2025-09-26.md"]);
		expect(model.breadcrumbs.map((link) => link.label)).to.deep.equal([
			"2025",
			"Q3",
			"September",
		]);
	});

	it("a yearly note has no breadcrumbs and lists its quarters", () => {
		const model = modelFor("Journal/2025.md");
		expect(model.breadcrumbs).to.deep.equal([]);
		expect(model.children.map((link) => link.label)).to.deep.equal([
			"Q1",
			"Q2",
			"Q3",
			"Q4",
		]);
		expect(model.previous?.label).to.equal("2024");
		expect(model.next?.label).to.equal("2026");
	});

	it("missing notes can be left out entirely", () => {
		const model = modelFor("Journal/2025-W39.md", { missingNotes: "hidden" });
		expect(model.children.map((link) => link.label)).to.deep.equal([
			"Thursday",
			"Friday",
		]);
		expect(model.next).to.equal(null);
		expect(model.previous).to.equal(null);
	});

	it("disabled periods drop out of the breadcrumbs and the contents row", () => {
		const model = modelFor("Journal/2025-09-26.md", {
			periods: {
				...settings.periods,
				weekly: { ...settings.periods.weekly, enabled: false },
			},
		});
		expect(model.breadcrumbs.map((link) => link.label)).to.deep.equal([
			"2025",
			"Q3",
			"September",
		]);

		const monthly = modelFor("Journal/2025-09.md", {
			periods: {
				...settings.periods,
				weekly: { ...settings.periods.weekly, enabled: false },
			},
		});
		expect(monthly.children).to.deep.equal([]);
	});

	it("rows can be switched off one by one", () => {
		const model = modelFor("Journal/2025-09-26.md", {
			showBreadcrumbs: false,
			showSiblings: false,
		});
		expect(model.breadcrumbs).to.deep.equal([]);
		expect(model.previous).to.equal(null);
		expect(model.next).to.equal(null);
		expect(model.current.label).to.equal("Friday");
	});
});
