import { PERIODS, type PeriodicNavSettings } from "./settings";
import type { NavLink, NavModel } from "./model";

export const NAVBAR_CLASS = "pnn-navbar";

export type ActivateFn = (link: NavLink, evt: MouseEvent | KeyboardEvent) => void;

/** Spoken description of a link, so the label alone does not have to carry it. */
function describe(link: NavLink, settings: PeriodicNavSettings): string {
	const noun = PERIODS[link.key].noun;
	const name = link.path.slice(link.path.lastIndexOf("/") + 1, -3);
	const parts = [`${link.label}, ${noun} ${name}`];
	if (!link.exists) {
		parts.push(
			settings.createMissingNotes ? "does not exist yet, click to create" : "does not exist"
		);
	}
	return parts.join(" — ");
}

function renderLink(
	parent: HTMLElement,
	link: NavLink,
	settings: PeriodicNavSettings,
	activate: ActivateFn,
	options: { arrow?: "before" | "after" } = {}
): HTMLElement {
	const clickable = link.exists || settings.createMissingNotes;

	const description = describe(link, settings);

	if (link.isCurrent) {
		return parent.createSpan({
			cls: "pnn-item pnn-current",
			text: link.label,
			attr: { "aria-current": "page", "aria-label": description },
		});
	}

	const el = parent.createEl("a", {
		cls: "pnn-item pnn-link",
		href: "#",
		title: description,
		attr: { "data-path": link.path, "aria-label": description },
	});

	if (options.arrow === "before") {
		el.createSpan({ cls: "pnn-arrow", text: "❮", attr: { "aria-hidden": "true" } });
	}
	el.createSpan({ cls: "pnn-label", text: link.label });
	if (options.arrow === "after") {
		el.createSpan({ cls: "pnn-arrow", text: "❯", attr: { "aria-hidden": "true" } });
	}

	if (!link.exists) {
		el.addClass("pnn-missing");
		if (!clickable) {
			el.addClass("pnn-disabled");
			el.setAttribute("aria-disabled", "true");
		}
	}

	const handle = (evt: MouseEvent | KeyboardEvent) => {
		evt.preventDefault();
		if (!clickable) return;
		activate(link, evt);
	};

	el.addEventListener("click", handle);
	el.addEventListener("auxclick", (evt) => {
		if (evt.button === 1) handle(evt);
	});
	el.addEventListener("keydown", (evt) => {
		if (evt.key === "Enter" || evt.key === " ") handle(evt);
	});

	return el;
}

function separator(parent: HTMLElement, text: string): void {
	const trimmed = text.trim();
	if (!trimmed) return;
	parent.createSpan({
		cls: "pnn-separator",
		text: trimmed,
		attr: { "aria-hidden": "true" },
	});
}

/**
 * Builds the navigation bar element. Returns null when there is nothing worth
 * showing, so the note is left untouched instead of gaining an empty bar.
 */
export function renderNavbar(
	model: NavModel,
	settings: PeriodicNavSettings,
	activate: ActivateFn
): HTMLElement | null {
	const hasSiblings = settings.showSiblings;
	if (!model.breadcrumbs.length && !model.children.length && !hasSiblings) {
		return null;
	}

	const nav = createEl("nav", {
		cls: [NAVBAR_CLASS, `pnn-position-${settings.position}`],
		attr: {
			"aria-label": "Periodic note navigation",
			"data-period": model.key,
		},
	});

	if (model.breadcrumbs.length) {
		const row = nav.createDiv({
			cls: "pnn-row pnn-breadcrumbs",
			attr: { "aria-label": "Parent notes" },
		});
		model.breadcrumbs.forEach((link, index) => {
			if (index > 0) separator(row, settings.breadcrumbSeparator);
			renderLink(row, link, settings, activate);
		});
	}

	if (hasSiblings) {
		const row = nav.createDiv({
			cls: "pnn-row pnn-siblings",
			attr: { "aria-label": `Nearby ${PERIODS[model.key].noun}s` },
		});
		if (model.previous) {
			renderLink(row, model.previous, settings, activate, {
				arrow: settings.showArrows ? "before" : undefined,
			});
			separator(row, settings.siblingSeparator);
		}
		renderLink(row, model.current, settings, activate);
		if (model.next) {
			separator(row, settings.siblingSeparator);
			renderLink(row, model.next, settings, activate, {
				arrow: settings.showArrows ? "after" : undefined,
			});
		}
	}

	if (model.children.length) {
		const row = nav.createDiv({
			cls: "pnn-row pnn-children",
			attr: { "aria-label": `${PERIODS[model.key].noun} contents` },
		});
		model.children.forEach((link, index) => {
			if (index > 0) separator(row, settings.childSeparator);
			renderLink(row, link, settings, activate);
		});
	}

	return nav.hasChildNodes() ? nav : null;
}
