import test from "node:test";
import assert from "node:assert/strict";
import moment from "moment";
import {
	addPeriods,
	getChildren,
	getParents,
	startOfWeek,
	usesIsoWeeks,
	weekOptions,
} from "../src/periods";

const iso = weekOptions("locale", "GGGG-[W]WW");
const localeWeeks = weekOptions("locale", "gggg-[W]ww");
const mondayWeeks = weekOptions("monday", "gggg-[W]ww");

test("ISO week tokens are detected, bracketed literals are not", () => {
	assert.equal(usesIsoWeeks("GGGG-[W]WW"), true);
	assert.equal(usesIsoWeeks("gggg-[W]ww"), false);
	assert.equal(usesIsoWeeks("[Week] w, YYYY"), false);
	assert.equal(usesIsoWeeks("[Week] W, YYYY"), true);
});

test("weeks start on the configured day", () => {
	const thursday = moment("2024-12-19", "YYYY-MM-DD");
	// The default English locale starts weeks on Sunday.
	assert.equal(startOfWeek(thursday, localeWeeks).format("YYYY-MM-DD"), "2024-12-15");
	assert.equal(startOfWeek(thursday, mondayWeeks).format("YYYY-MM-DD"), "2024-12-16");
	assert.equal(startOfWeek(thursday, iso).format("YYYY-MM-DD"), "2024-12-16");
	// A date that is already the first day of the week stays put.
	assert.equal(
		startOfWeek(moment("2024-12-16", "YYYY-MM-DD"), iso).format("YYYY-MM-DD"),
		"2024-12-16"
	);
});

test("stepping through periods lands on the start of the neighbour", () => {
	const jan31 = moment("2024-01-31", "YYYY-MM-DD");
	assert.equal(addPeriods(jan31, "daily", 1, iso).format("YYYY-MM-DD"), "2024-02-01");
	assert.equal(addPeriods(jan31, "monthly", 1, iso).format("YYYY-MM-DD"), "2024-02-01");
	assert.equal(addPeriods(jan31, "monthly", -1, iso).format("YYYY-MM-DD"), "2023-12-01");
	assert.equal(addPeriods(jan31, "quarterly", 1, iso).format("YYYY-MM-DD"), "2024-04-01");
	assert.equal(addPeriods(jan31, "quarterly", -1, iso).format("YYYY-MM-DD"), "2023-10-01");
	assert.equal(addPeriods(jan31, "yearly", 1, iso).format("YYYY-MM-DD"), "2025-01-01");
	assert.equal(
		addPeriods(moment("2024-12-30", "YYYY-MM-DD"), "weekly", 1, iso).format("YYYY-MM-DD"),
		"2025-01-06"
	);
});

test("a week belongs to the month and year that hold its middle day", () => {
	// Week 1 of 2025 starts on 30 December 2024 but belongs to January 2025.
	const week = moment("2025-W01", "GGGG-[W]WW");
	const parents = getParents(week, "weekly", iso);
	assert.deepEqual(
		parents.map((parent) => `${parent.key}:${parent.date.format("YYYY-MM-DD")}`),
		["yearly:2025-01-01", "quarterly:2025-01-01", "monthly:2025-01-01"]
	);

	// Week 51 of 2024 sits squarely inside December, as in the screenshots.
	const december = getParents(moment("2024-W51", "GGGG-[W]WW"), "weekly", iso);
	assert.deepEqual(
		december.map((parent) => parent.date.format("YYYY-MM-DD")),
		["2024-01-01", "2024-10-01", "2024-12-01"]
	);
});

test("a day lists year, quarter, month and week as parents", () => {
	const parents = getParents(moment("2025-09-26", "YYYY-MM-DD"), "daily", iso);
	assert.deepEqual(
		parents.map((parent) => `${parent.key}:${parent.date.format("YYYY-MM-DD")}`),
		[
			"yearly:2025-01-01",
			"quarterly:2025-07-01",
			"monthly:2025-09-01",
			"weekly:2025-09-22",
		]
	);
});

test("a year holds four quarters and a quarter holds three months", () => {
	const quarters = getChildren(moment("2024-06-15", "YYYY-MM-DD"), "yearly", iso);
	assert.deepEqual(
		quarters.map((quarter) => quarter.date.format("YYYY-MM-DD")),
		["2024-01-01", "2024-04-01", "2024-07-01", "2024-10-01"]
	);

	const months = getChildren(moment("2024-11-05", "YYYY-MM-DD"), "quarterly", iso);
	assert.deepEqual(
		months.map((month) => month.date.format("YYYY-MM-DD")),
		["2024-10-01", "2024-11-01", "2024-12-01"]
	);
});

test("a month lists every week that touches it, including the spill-over ones", () => {
	const weeks = getChildren(moment("2024-12-01", "YYYY-MM-DD"), "monthly", iso);
	assert.deepEqual(
		weeks.map((week) => week.date.format("GGGG-[W]WW")),
		["2024-W48", "2024-W49", "2024-W50", "2024-W51", "2024-W52", "2025-W01"]
	);
});

test("a week holds seven days, starting on the configured day", () => {
	const days = getChildren(moment("2024-12-19", "YYYY-MM-DD"), "weekly", iso);
	assert.equal(days.length, 7);
	assert.equal(days[0].date.format("YYYY-MM-DD dddd"), "2024-12-16 Monday");
	assert.equal(days[6].date.format("YYYY-MM-DD dddd"), "2024-12-22 Sunday");

	const localeDays = getChildren(moment("2024-12-19", "YYYY-MM-DD"), "weekly", localeWeeks);
	assert.equal(localeDays[0].date.format("YYYY-MM-DD dddd"), "2024-12-15 Sunday");
});

test("stepping across a daylight saving change keeps whole days", () => {
	const before = moment("2025-03-29", "YYYY-MM-DD");
	assert.equal(addPeriods(before, "daily", 1, iso).format("YYYY-MM-DD"), "2025-03-30");
	assert.equal(addPeriods(before, "daily", 2, iso).format("YYYY-MM-DD"), "2025-03-31");
});
