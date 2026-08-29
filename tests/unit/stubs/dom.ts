/**
 * A small stand-in for the DOM helpers Obsidian adds to Element and to the
 * global scope, so the navigation bar can be rendered inside jsdom.
 */
import { JSDOM } from "jsdom";

interface ElementInfo {
	cls?: string | string[];
	text?: string;
	href?: string;
	title?: string;
	attr?: Record<string, string | number | boolean | null>;
}

export function setupDom(): Document {
	const dom = new JSDOM("<!doctype html><html><body></body></html>");
	const { window } = dom;
	const proto = window.Element.prototype as unknown as Record<string, unknown>;

	const apply = (el: Element, info?: ElementInfo | string) => {
		if (!info) return el;
		if (typeof info === "string") {
			el.className = info;
			return el;
		}
		if (info.cls) {
			el.className = Array.isArray(info.cls) ? info.cls.join(" ") : info.cls;
		}
		if (info.text !== undefined) el.textContent = info.text;
		if (info.href !== undefined) el.setAttribute("href", info.href);
		if (info.title !== undefined) el.setAttribute("title", info.title);
		for (const [key, value] of Object.entries(info.attr ?? {})) {
			if (value !== null) el.setAttribute(key, String(value));
		}
		return el;
	};

	const create = (tag: string, info?: ElementInfo | string) =>
		apply(window.document.createElement(tag), info);

	proto.createEl = function (this: Element, tag: string, info?: ElementInfo) {
		return this.appendChild(create(tag, info));
	};
	proto.createDiv = function (this: Element, info?: ElementInfo) {
		return this.appendChild(create("div", info));
	};
	proto.createSpan = function (this: Element, info?: ElementInfo) {
		return this.appendChild(create("span", info));
	};
	proto.addClass = function (this: Element, ...classes: string[]) {
		this.classList.add(...classes);
	};
	proto.detach = function (this: Element) {
		this.remove();
	};
	proto.empty = function (this: Element) {
		this.textContent = "";
	};

	const globals = globalThis as unknown as Record<string, unknown>;
	globals.window = window;
	globals.document = window.document;
	globals.createEl = create;
	globals.createDiv = (info?: ElementInfo) => create("div", info);
	globals.createSpan = (info?: ElementInfo) => create("span", info);
	globals.MouseEvent = window.MouseEvent;
	globals.KeyboardEvent = window.KeyboardEvent;

	return window.document;
}
