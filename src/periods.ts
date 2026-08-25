import { moment } from "obsidian";
import type { Moment } from "moment";
import { PERIODS, type PeriodKey, type WeekStart } from "./settings";

export interface PeriodDate {
	key: PeriodKey;
	/** Start of the period. Always normalised, see `startOfPeriod`. */
	date: Moment;
}

export interface WeekOptions {
	weekStart: WeekStart;
	/** Weekly notes are named with ISO week tokens, so weeks start on Monday. */
	iso: boolean;
}

/** Removes `[escaped]` literals so format tokens can be inspected safely. */
export function stripLiterals(format: string): string {
	return format.replace(/\[[^\]]*\]/g, "");
}

/** ISO week tokens (`W`, `WW`, `GGGG`, `GG`) pin the week to a Monday start. */
export function usesIsoWeeks(format: string): boolean {
	return /W|G/.test(stripLiterals(format));
}

export function weekOptions(
	weekStart: WeekStart,
	weeklyFormat: string
): WeekOptions {
	return { weekStart, iso: usesIsoWeeks(weeklyFormat) };
}

/** Day of the week the week starts on, 0 = Sunday … 6 = Saturday. */
function firstDayOfWeek(options: WeekOptions): number {
	if (options.iso || options.weekStart === "monday") return 1;
	if (options.weekStart === "sunday") return 0;
	return moment.localeData().firstDayOfWeek();
}

export function startOfWeek(date: Moment, options: WeekOptions): Moment {
	const first = firstDayOfWeek(options);
	const start = date.clone().startOf("day");
	const diff = (start.day() - first + 7) % 7;
	return start.subtract(diff, "days");
}

/**
 * The day that decides which month, quarter and year a week belongs to.
 * Weeks straddle those boundaries, so the middle of the week decides — the same
 * rule ISO uses when it assigns a week to the year containing its Thursday.
 */
export function weekAnchor(weekStart: Moment): Moment {
	return weekStart.clone().add(3, "days");
}

/** Normalises any date to the start of the period it falls in. */
export function startOfPeriod(
	date: Moment,
	key: PeriodKey,
	options: WeekOptions
): Moment {
	switch (key) {
		case "daily":
			return date.clone().startOf("day");
		case "weekly":
			return startOfWeek(date, options);
		case "monthly":
			return date.clone().startOf("month");
		case "quarterly":
			return date.clone().startOf("quarter");
		case "yearly":
			return date.clone().startOf("year");
	}
}

/**
 * The date used to resolve `{{date:…}}` folder placeholders and to look up the
 * parents of a period. For weeks this is the middle of the week, so a note in
 * week 1 that starts in December is filed under the year the week belongs to.
 */
export function referenceDate(
	date: Moment,
	key: PeriodKey,
	options: WeekOptions
): Moment {
	const start = startOfPeriod(date, key, options);
	return key === "weekly" ? weekAnchor(start) : start;
}

export function addPeriods(
	date: Moment,
	key: PeriodKey,
	amount: number,
	options: WeekOptions
): Moment {
	const start = startOfPeriod(date, key, options);
	switch (key) {
		case "daily":
			return start.add(amount, "days");
		case "weekly":
			return start.add(amount, "weeks");
		case "monthly":
			return start.add(amount, "months");
		case "quarterly":
			return start.add(amount * 3, "months");
		case "yearly":
			return start.add(amount, "years");
	}
}

/** Ancestors of a period, ordered from the longest period to the shortest. */
export function getParents(
	date: Moment,
	key: PeriodKey,
	options: WeekOptions
): PeriodDate[] {
	const reference = referenceDate(date, key, options);
	return PERIODS[key].parents.map((parent) => ({
		key: parent,
		date: startOfPeriod(reference, parent, options),
	}));
}

/** The periods a note is made up of, in chronological order. */
export function getChildren(
	date: Moment,
	key: PeriodKey,
	options: WeekOptions
): PeriodDate[] {
	const child = PERIODS[key].child;
	if (!child) return [];
	const start = startOfPeriod(date, key, options);

	if (key === "monthly") {
		// Every week that holds at least one day of the month, so the weeks that
		// spill over into the neighbouring months are listed too.
		const monthEnd = start.clone().endOf("month");
		const weeks: PeriodDate[] = [];
		let cursor = startOfWeek(start, options);
		while (cursor.isSameOrBefore(monthEnd)) {
			weeks.push({ key: "weekly", date: cursor.clone() });
			cursor = cursor.clone().add(1, "week");
		}
		return weeks;
	}

	const counts: Record<PeriodKey, number> = {
		daily: 0,
		weekly: 7,
		monthly: 0,
		quarterly: 3,
		yearly: 4,
	};
	const count = counts[key];
	const result: PeriodDate[] = [];
	for (let i = 0; i < count; i++) {
		result.push({ key: child, date: addPeriods(start, child, i, options) });
	}
	return result;
}
