import type { Moment } from "moment";
import { PERIODS, type PeriodicNavSettings, type PeriodKey } from "./settings";
import { addPeriods, getChildren, getParents } from "./periods";
import {
	noteLabel,
	notePath,
	weekOptionsFor,
	type PeriodMatch,
} from "./paths";

export interface NavLink {
	key: PeriodKey;
	date: Moment;
	label: string;
	path: string;
	exists: boolean;
	/** True for the note that is currently open. */
	isCurrent: boolean;
}

export interface NavModel {
	key: PeriodKey;
	date: Moment;
	breadcrumbs: NavLink[];
	previous: NavLink | null;
	current: NavLink;
	next: NavLink | null;
	children: NavLink[];
}

export type ExistsFn = (path: string) => boolean;

export function createLink(
	key: PeriodKey,
	date: Moment,
	settings: PeriodicNavSettings,
	exists: ExistsFn,
	isCurrent = false
): NavLink {
	const path = notePath(key, date, settings);
	return {
		key,
		date,
		path,
		label: noteLabel(key, date, settings),
		exists: exists(path),
		isCurrent,
	};
}

/** Drops links to notes that do not exist when they should stay hidden. */
function keep(link: NavLink, settings: PeriodicNavSettings): boolean {
	return link.exists || settings.missingNotes !== "hidden";
}

export function buildNavModel(
	match: PeriodMatch,
	settings: PeriodicNavSettings,
	exists: ExistsFn
): NavModel {
	const { key, date } = match;
	const options = weekOptionsFor(settings);

	const breadcrumbs = settings.showBreadcrumbs
		? getParents(date, key, options)
				.filter((parent) => settings.periods[parent.key].enabled)
				.map((parent) => createLink(parent.key, parent.date, settings, exists))
				.filter((link) => keep(link, settings))
		: [];

	const childKey = PERIODS[key].child;
	const children =
		settings.showChildren && childKey && settings.periods[childKey].enabled
			? getChildren(date, key, options)
					.map((child) => createLink(child.key, child.date, settings, exists))
					.filter((link) => keep(link, settings))
			: [];

	const current = createLink(key, date, settings, exists, true);
	let previous: NavLink | null = null;
	let next: NavLink | null = null;
	if (settings.showSiblings) {
		previous = createLink(key, addPeriods(date, key, -1, options), settings, exists);
		next = createLink(key, addPeriods(date, key, 1, options), settings, exists);
		if (!keep(previous, settings)) previous = null;
		if (!keep(next, settings)) next = null;
	}

	return { key, date, breadcrumbs, previous, current, next, children };
}
