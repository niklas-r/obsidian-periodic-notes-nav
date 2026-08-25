import { moment, normalizePath } from "obsidian";
import type { Moment } from "moment";
import {
	PERIOD_ORDER,
	type PeriodicNavSettings,
	type PeriodKey,
} from "./settings";
import {
	referenceDate,
	startOfPeriod,
	weekOptions,
	type WeekOptions,
} from "./periods";

const DATE_PLACEHOLDER = /\{\{\s*date\s*(?::\s*([^}]*?))?\s*\}\}/g;
const TIME_PLACEHOLDER = /\{\{\s*time\s*(?::\s*([^}]*?))?\s*\}\}/g;
const TITLE_PLACEHOLDER = /\{\{\s*title\s*\}\}/g;

export function weekOptionsFor(settings: PeriodicNavSettings): WeekOptions {
	return weekOptions(settings.weekStart, settings.periods.weekly.format);
}

/** Replaces `{{date}}` / `{{date:FORMAT}}` placeholders in a folder path. */
export function resolveFolder(folder: string, date: Moment): string {
	const resolved = folder.replace(DATE_PLACEHOLDER, (_match, format) =>
		date.format(format || "YYYY-MM-DD")
	);
	return normalizePath(resolved).replace(/^\/+|\/+$/g, "");
}

export function noteBasename(
	key: PeriodKey,
	date: Moment,
	settings: PeriodicNavSettings
): string {
	const options = weekOptionsFor(settings);
	return startOfPeriod(date, key, options).format(settings.periods[key].format);
}

/** Full vault path of the note for a period, whether or not it exists. */
export function notePath(
	key: PeriodKey,
	date: Moment,
	settings: PeriodicNavSettings
): string {
	const options = weekOptionsFor(settings);
	const folder = resolveFolder(
		settings.periods[key].folder,
		referenceDate(date, key, options)
	);
	const basename = noteBasename(key, date, settings);
	return normalizePath(folder ? `${folder}/${basename}.md` : `${basename}.md`);
}

export function noteLabel(
	key: PeriodKey,
	date: Moment,
	settings: PeriodicNavSettings
): string {
	const options = weekOptionsFor(settings);
	const label = settings.periods[key].label.trim();
	const start = startOfPeriod(date, key, options);
	return label ? start.format(label) : start.format(settings.periods[key].format);
}

export interface PeriodMatch {
	key: PeriodKey;
	/** Start of the period the file belongs to. */
	date: Moment;
}

/**
 * Works out which period a file belongs to, if any. A file matches when its
 * name parses with the period's date format *and* the path the settings would
 * generate for the resulting date is the path the file actually has — that way
 * a note only counts as periodic when it also lives in the configured folder.
 */
export function matchPeriodicNote(
	path: string,
	settings: PeriodicNavSettings
): PeriodMatch | null {
	if (!path.toLowerCase().endsWith(".md")) return null;
	const options = weekOptionsFor(settings);
	const basename = path.slice(path.lastIndexOf("/") + 1, -3);

	for (const key of PERIOD_ORDER) {
		const period = settings.periods[key];
		if (!period.enabled || !period.format) continue;

		const parsed = moment(basename, period.format, true);
		if (!parsed.isValid()) continue;

		const date = startOfPeriod(parsed, key, options);
		if (noteBasename(key, date, settings) !== basename) continue;
		if (notePath(key, date, settings) !== normalizePath(path)) continue;

		return { key, date };
	}
	return null;
}

/** Fills the placeholders a template file may use for a new periodic note. */
export function applyTemplate(
	content: string,
	date: Moment,
	title: string,
	now: Moment
): string {
	return content
		.replace(DATE_PLACEHOLDER, (_match, format) =>
			date.format(format || "YYYY-MM-DD")
		)
		.replace(TIME_PLACEHOLDER, (_match, format) =>
			now.format(format || "HH:mm")
		)
		.replace(TITLE_PLACEHOLDER, title);
}
