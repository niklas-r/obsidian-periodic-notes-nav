import { PERIODS, type PeriodicNavSettings } from "./settings";
import type { NavLink, NavModel } from "./model";

export const NAVBAR_CLASS = "pnn-navbar";

export type ActivateFn = (
	link: NavLink,
	evt: MouseEvent | KeyboardEvent
) => void;

let labelSequence = 0;

/**
 * Names an element for screen readers. Obsidian renders a hover tooltip for
 * anything carrying an aria-label, which is noise on a bar whose links are
 * already labelled, so the name is put in a visually hidden element and
 * referenced instead.
 */
function nameElement(el: HTMLElement, name: string): void {
	const id = `pnn-label-${++labelSequence}`;
	el.createSpan({ cls: "pnn-sr-only", text: name, attr: { id } });
	el.setAttribute("aria-labelledby", id);
}

/**
 * What a link's visible label leaves out: which note it leads to, and whether
 * that note has been written yet. Read out after the label, never shown.
 */
function linkDetail(link: NavLink, settings: PeriodicNavSettings): string {
	const noun = PERIODS[link.key].noun;
	const name = link.path.slice(link.path.lastIndexOf("/") + 1, -3);
	const parts = [`${noun} ${name}`];
	if (!link.exists) {
		parts.push(
			settings.createMissingNotes
				? "does not exist yet, click to create"
				: "does not exist"
		);
	}
	return `(${parts.join(", ")})`;
}

function renderLink(
	parent: HTMLElement,
	link: NavLink,
	settings: PeriodicNavSettings,
	activate: ActivateFn,
	options: { arrow?: "before" | "after" } = {}
): HTMLElement {
	const clickable = link.exists || settings.createMissingNotes;
	const detail = linkDetail(link, settings);

	if (link.isCurrent) {
		const current = parent.createSpan({
			cls: "pnn-item pnn-current",
			attr: { "aria-current": "page" },
		});
		current.createSpan({ cls: "pnn-label", text: link.label });
		current.createSpan({ cls: "pnn-sr-only", text: detail });
		return current;
	}

	const el = parent.createEl("a", {
		cls: "pnn-item pnn-link",
		href: "#",
		attr: { "data-path": link.path },
	});

	if (options.arrow === "before") {
		el.createSpan({
			cls: "pnn-arrow",
			text: "❮",
			attr: { "aria-hidden": "true" },
		});
	}
	el.createSpan({ cls: "pnn-label", text: link.label });
	el.createSpan({ cls: "pnn-sr-only", text: detail });
	if (options.arrow === "after") {
		el.createSpan({
			cls: "pnn-arrow",
			text: "❯",
			attr: { "aria-hidden": "true" },
		});
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
 * Builds the navigation bar inside the given container and returns it, or
 * returns null when there is nothing worth showing, leaving the container
 * untouched instead of giving it an empty bar.
 *
 * The element is created through the container so that it belongs to the
 * container's own document, which is what a note opened in a pop-out window
 * needs.
 */
export function renderNavbar(
	container: HTMLElement,
	model: NavModel,
	settings: PeriodicNavSettings,
	activate: ActivateFn
): HTMLElement | null {
	const hasSiblings = settings.showSiblings;
	if (!model.breadcrumbs.length && !model.children.length && !hasSiblings) {
		return null;
	}

	const nav = container.createEl("nav", {
		cls: [NAVBAR_CLASS, `pnn-position-${settings.position}`],
		attr: { "data-period": model.key },
		prepend: settings.position === "top",
	});
	nameElement(nav, "Periodic note navigation");

	if (model.breadcrumbs.length) {
		const row = nav.createDiv({
			cls: "pnn-row pnn-breadcrumbs",
			attr: { role: "group" },
		});
		nameElement(row, "Parent notes");
		model.breadcrumbs.forEach((link, index) => {
			if (index > 0) separator(row, settings.breadcrumbSeparator);
			renderLink(row, link, settings, activate);
		});
	}

	if (hasSiblings) {
		const row = nav.createDiv({
			cls: "pnn-row pnn-siblings",
			attr: { role: "group" },
		});
		nameElement(row, `Nearby ${PERIODS[model.key].noun}s`);
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
			attr: { role: "group" },
		});
		nameElement(row, `${PERIODS[model.key].noun} contents`);
		model.children.forEach((link, index) => {
			if (index > 0) separator(row, settings.childSeparator);
			renderLink(row, link, settings, activate);
		});
	}

	return nav;
}
