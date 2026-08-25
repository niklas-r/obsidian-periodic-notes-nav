export type PeriodKey = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

/** Ordered from the shortest period to the longest one. */
export const PERIOD_ORDER: PeriodKey[] = [
	"daily",
	"weekly",
	"monthly",
	"quarterly",
	"yearly",
];

export interface PeriodMeta {
	key: PeriodKey;
	/** Name of the period, used in settings and in accessible labels. */
	name: string;
	/** Name of a single note of this period, used in accessible labels. */
	noun: string;
	/** Ancestors of this period, ordered from the longest period to the shortest one. */
	parents: PeriodKey[];
	/** The period a note of this period is made up of. */
	child: PeriodKey | null;
}

export const PERIODS: Record<PeriodKey, PeriodMeta> = {
	daily: {
		key: "daily",
		name: "Daily",
		noun: "daily note",
		parents: ["yearly", "quarterly", "monthly", "weekly"],
		child: null,
	},
	weekly: {
		key: "weekly",
		name: "Weekly",
		noun: "weekly note",
		parents: ["yearly", "quarterly", "monthly"],
		child: "daily",
	},
	monthly: {
		key: "monthly",
		name: "Monthly",
		noun: "monthly note",
		parents: ["yearly", "quarterly"],
		child: "weekly",
	},
	quarterly: {
		key: "quarterly",
		name: "Quarterly",
		noun: "quarterly note",
		parents: ["yearly"],
		child: "monthly",
	},
	yearly: {
		key: "yearly",
		name: "Yearly",
		noun: "yearly note",
		parents: [],
		child: "quarterly",
	},
};

export interface PeriodSettings {
	enabled: boolean;
	/** Folder the notes live in. Supports `{{date:FORMAT}}` placeholders. */
	folder: string;
	/** Moment.js format of the file name, without the `.md` extension. */
	format: string;
	/** Moment.js format used for the link labels in the navigation bar. */
	label: string;
	/** Optional template file used when a missing note is created. */
	template: string;
}

export type WeekStart = "locale" | "monday" | "sunday";

export interface PeriodicNavSettings {
	/** Master switch for the navigation bar. */
	enabled: boolean;
	position: "top" | "bottom";
	showBreadcrumbs: boolean;
	showSiblings: boolean;
	showChildren: boolean;
	showArrows: boolean;
	/** What to do with notes that do not exist yet. */
	missingNotes: "muted" | "hidden";
	/** Create the note when a muted (missing) link is activated. */
	createMissingNotes: boolean;
	breadcrumbSeparator: string;
	siblingSeparator: string;
	childSeparator: string;
	/**
	 * First day of the week. Ignored when the weekly file name format uses ISO
	 * week tokens (`W`, `WW`, `GGGG`), which always start the week on Monday.
	 */
	weekStart: WeekStart;
	periods: Record<PeriodKey, PeriodSettings>;
}

export const DEFAULT_SETTINGS: PeriodicNavSettings = {
	enabled: true,
	position: "top",
	showBreadcrumbs: true,
	showSiblings: true,
	showChildren: true,
	showArrows: true,
	missingNotes: "muted",
	createMissingNotes: true,
	breadcrumbSeparator: "/",
	siblingSeparator: "|",
	childSeparator: "-",
	weekStart: "locale",
	periods: {
		daily: {
			enabled: true,
			folder: "",
			format: "YYYY-MM-DD",
			label: "dddd",
			template: "",
		},
		weekly: {
			enabled: true,
			folder: "",
			format: "gggg-[W]ww",
			label: "[Week] w",
			template: "",
		},
		monthly: {
			enabled: true,
			folder: "",
			format: "YYYY-MM",
			label: "MMMM",
			template: "",
		},
		quarterly: {
			enabled: true,
			folder: "",
			format: "YYYY-[Q]Q",
			label: "[Q]Q",
			template: "",
		},
		yearly: {
			enabled: true,
			folder: "",
			format: "YYYY",
			label: "YYYY",
			template: "",
		},
	},
};

/** Merges stored settings over the defaults without losing new keys. */
export function mergeSettings(stored: unknown): PeriodicNavSettings {
	const data = (stored ?? {}) as Partial<PeriodicNavSettings>;
	const periods = {} as Record<PeriodKey, PeriodSettings>;
	for (const key of PERIOD_ORDER) {
		periods[key] = {
			...DEFAULT_SETTINGS.periods[key],
			...(data.periods?.[key] ?? {}),
		};
	}
	return { ...DEFAULT_SETTINGS, ...data, periods };
}
