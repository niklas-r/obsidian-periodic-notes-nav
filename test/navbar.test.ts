import test from "node:test";
import assert from "node:assert/strict";
import { setupDom } from "./stubs/dom";

setupDom();

const { mergeSettings } = await import("../src/settings");
const { matchPeriodicNote } = await import("../src/paths");
const { buildNavModel } = await import("../src/model");
const { renderNavbar } = await import("../src/navbar");
import type { NavLink } from "../src/model";
import type { PeriodicNavSettings } from "../src/settings";

const base = {
	weekStart: "monday" as const,
	periods: {
		daily: { folder: "Journal", format: "YYYY-MM-DD", label: "dddd" },
		weekly: { folder: "Journal", format: "GGGG-[W]WW", label: "[Week] W" },
		monthly: { folder: "Journal", format: "YYYY-MM", label: "MMMM" },
		quarterly: { folder: "Journal", format: "YYYY-[Q]Q", label: "[Q]Q" },
		yearly: { folder: "Journal", format: "YYYY", label: "YYYY" },
	},
};

const existing = new Set([
	"Journal/2025-09-26.md",
	"Journal/2025-09-25.md",
	"Journal/2025-09.md",
]);

function render(path: string, overrides: Partial<PeriodicNavSettings> = {}) {
	const settings = mergeSettings({ ...base, ...overrides });
	const match = matchPeriodicNote(path, settings);
	assert.ok(match);
	const model = buildNavModel(match, settings, (candidate) =>
		existing.has(candidate)
	);
	const activated: NavLink[] = [];
	const nav = renderNavbar(model, settings, (link) => activated.push(link));
	assert.ok(nav);
	return { nav, activated };
}

test("the bar renders one row per kind of link", () => {
	const { nav } = render("Journal/2025-09-26.md");
	assert.equal(nav.tagName, "NAV");
	assert.equal(nav.getAttribute("aria-label"), "Periodic note navigation");
	assert.equal(nav.getAttribute("data-period"), "daily");

	const rows = [...nav.querySelectorAll(".pnn-row")];
	assert.deepEqual(
		rows.map((row) => row.getAttribute("aria-label")),
		["Parent notes", "Nearby daily notes"]
	);

	const breadcrumbs = [...rows[0].querySelectorAll(".pnn-item")];
	assert.deepEqual(
		breadcrumbs.map((el) => el.textContent),
		["2025", "Q3", "September", "Week 39"]
	);
	assert.deepEqual(
		[...rows[0].querySelectorAll(".pnn-separator")].map((el) => el.textContent),
		["/", "/", "/"]
	);
});

test("the open note is marked as current and is not a link", () => {
	const { nav } = render("Journal/2025-09-26.md");
	const current = nav.querySelector(".pnn-current");
	assert.ok(current);
	assert.equal(current.tagName, "SPAN");
	assert.equal(current.textContent, "Friday");
	assert.equal(current.getAttribute("aria-current"), "page");
});

test("links carry a spoken description of where they lead", () => {
	const { nav } = render("Journal/2025-09-26.md");
	const previous = nav.querySelector(".pnn-siblings .pnn-link");
	assert.ok(previous);
	assert.equal(
		previous.getAttribute("aria-label"),
		"Thursday, daily note 2025-09-25"
	);
	assert.equal(previous.querySelector(".pnn-arrow")?.textContent, "❮");
	assert.equal(
		previous.querySelector(".pnn-arrow")?.getAttribute("aria-hidden"),
		"true"
	);
});

test("notes that do not exist are marked and describe what a click will do", () => {
	const { nav } = render("Journal/2025-09-26.md");
	const next = nav.querySelector(".pnn-siblings .pnn-link.pnn-missing");
	assert.ok(next);
	assert.equal(
		next.getAttribute("aria-label"),
		"Saturday, daily note 2025-09-27 — does not exist yet, click to create"
	);
	assert.equal(next.classList.contains("pnn-disabled"), false);
});

test("missing notes are inert when they are not allowed to be created", () => {
	const { nav, activated } = render("Journal/2025-09-26.md", {
		createMissingNotes: false,
	});
	const next = nav.querySelector<HTMLElement>(
		".pnn-siblings .pnn-link.pnn-missing"
	);
	assert.ok(next);
	assert.equal(next.getAttribute("aria-disabled"), "true");
	next.dispatchEvent(
		new MouseEvent("click", { bubbles: true, cancelable: true })
	);
	assert.deepEqual(activated, []);
});

test("clicking and pressing Enter on a link both open it", () => {
	const { nav, activated } = render("Journal/2025-09-26.md");
	const previous = nav.querySelector<HTMLElement>(".pnn-siblings .pnn-link");
	assert.ok(previous);

	const click = new MouseEvent("click", { bubbles: true, cancelable: true });
	previous.dispatchEvent(click);
	assert.equal(click.defaultPrevented, true);
	assert.equal(activated.length, 1);
	assert.equal(activated[0].path, "Journal/2025-09-25.md");

	previous.dispatchEvent(
		new KeyboardEvent("keydown", {
			key: "Enter",
			bubbles: true,
			cancelable: true,
		})
	);
	assert.equal(activated.length, 2);
});

test("a weekly note renders its days in a third row", () => {
	const { nav } = render("Journal/2025-W39.md");
	const rows = [...nav.querySelectorAll(".pnn-row")];
	assert.deepEqual(
		rows.map((row) => row.getAttribute("aria-label")),
		["Parent notes", "Nearby weekly notes", "weekly note contents"]
	);
	assert.deepEqual(
		[...rows[2].querySelectorAll(".pnn-item")].map((el) => el.textContent),
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
	assert.equal(rows[2].querySelectorAll(".pnn-missing").length, 5);
});

test("the position setting is reflected in a class on the bar", () => {
	assert.ok(
		render("Journal/2025-09-26.md").nav.classList.contains("pnn-position-top")
	);
	assert.ok(
		render("Journal/2025-09-26.md", {
			position: "bottom",
		}).nav.classList.contains("pnn-position-bottom")
	);
});
