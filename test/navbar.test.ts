import { describe, it } from "mocha";
import { expect } from "chai";
import { assertExists } from "./helpers";
import { mergeSettings, type PeriodicNavSettings } from "../src/settings";
import { matchPeriodicNote } from "../src/paths";
import { buildNavModel, type NavLink } from "../src/model";
import { renderNavbar } from "../src/navbar";

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

/** Resolves the accessible name the way a screen reader would. */
function accessibleName(el: Element): string {
	const id = el.getAttribute("aria-labelledby");
	// The bar is built detached, so the reference is resolved within it.
	if (id) return el.querySelector(`#${id}`)?.textContent ?? "";
	return [...el.childNodes]
		.filter(
			(node) =>
				node.nodeType !== 1 ||
				(node as Element).getAttribute("aria-hidden") !== "true"
		)
		.map((node) => node.textContent ?? "")
		.join(" ")
		.replace(/\s+/g, " ")
		.trim();
}

function render(path: string, overrides: Partial<PeriodicNavSettings> = {}) {
	const settings = mergeSettings({ ...base, ...overrides });
	const match = matchPeriodicNote(path, settings);
	assertExists(match);
	const model = buildNavModel(match, settings, (candidate) =>
		existing.has(candidate)
	);
	const activated: NavLink[] = [];
	const container = document.createElement("div");
	const nav = renderNavbar(container, model, settings, (link) =>
		activated.push(link)
	);
	assertExists(nav);
	return { nav, container, activated };
}

describe("navbar", () => {
	it("the bar renders one row per kind of link", () => {
		const { nav } = render("Journal/2025-09-26.md");
		expect(nav.tagName).to.equal("NAV");
		expect(accessibleName(nav)).to.equal("Periodic note navigation");
		expect(nav.getAttribute("data-period")).to.equal("daily");

		const rows = [...nav.querySelectorAll(".pnn-row")];
		expect(rows.map((row) => accessibleName(row))).to.deep.equal([
			"Parent notes",
			"Nearby daily notes",
		]);
		expect(rows.map((row) => row.getAttribute("role"))).to.deep.equal([
			"group",
			"group",
		]);

		const breadcrumbs = [...rows[0].querySelectorAll(".pnn-item .pnn-label")];
		expect(breadcrumbs.map((el) => el.textContent)).to.deep.equal([
			"2025",
			"Q3",
			"September",
			"Week 39",
		]);
		expect(
			[...rows[0].querySelectorAll(".pnn-separator")].map(
				(el) => el.textContent
			)
		).to.deep.equal(["/", "/", "/"]);
	});

	it("the open note is marked as current and is not a link", () => {
		const { nav } = render("Journal/2025-09-26.md");
		const current = nav.querySelector(".pnn-current");
		assertExists(current);
		expect(current.tagName).to.equal("SPAN");
		expect(current.querySelector(".pnn-label")?.textContent).to.equal("Friday");
		expect(current.getAttribute("aria-current")).to.equal("page");
		expect(accessibleName(current)).to.equal("Friday (daily note 2025-09-26)");
	});

	it("links carry a spoken description of where they lead", () => {
		const { nav } = render("Journal/2025-09-26.md");
		const previous = nav.querySelector(".pnn-siblings .pnn-link");
		assertExists(previous);
		expect(accessibleName(previous)).to.equal(
			"Thursday (daily note 2025-09-25)"
		);
		expect(previous.querySelector(".pnn-arrow")?.textContent).to.equal("❮");
		expect(
			previous.querySelector(".pnn-arrow")?.getAttribute("aria-hidden")
		).to.equal("true");
	});

	it("notes that do not exist are marked and describe what a click will do", () => {
		const { nav } = render("Journal/2025-09-26.md");
		const next = nav.querySelector(".pnn-siblings .pnn-link.pnn-missing");
		assertExists(next);
		expect(accessibleName(next)).to.equal(
			"Saturday (daily note 2025-09-27, does not exist yet, click to create)"
		);
		expect(next.classList.contains("pnn-disabled")).to.equal(false);
	});

	it("missing notes are inert when they are not allowed to be created", () => {
		const { nav, activated } = render("Journal/2025-09-26.md", {
			createMissingNotes: false,
		});
		const next = nav.querySelector<HTMLElement>(
			".pnn-siblings .pnn-link.pnn-missing"
		);
		assertExists(next);
		expect(next.getAttribute("aria-disabled")).to.equal("true");
		next.dispatchEvent(
			new MouseEvent("click", { bubbles: true, cancelable: true })
		);
		expect(activated).to.deep.equal([]);
	});

	it("clicking and pressing Enter on a link both open it", () => {
		const { nav, activated } = render("Journal/2025-09-26.md");
		const previous = nav.querySelector<HTMLElement>(".pnn-siblings .pnn-link");
		assertExists(previous);

		const click = new MouseEvent("click", { bubbles: true, cancelable: true });
		previous.dispatchEvent(click);
		expect(click.defaultPrevented).to.equal(true);
		expect(activated.length).to.equal(1);
		expect(activated[0].path).to.equal("Journal/2025-09-25.md");

		previous.dispatchEvent(
			new KeyboardEvent("keydown", {
				key: "Enter",
				bubbles: true,
				cancelable: true,
			})
		);
		expect(activated.length).to.equal(2);
	});

	it("a weekly note renders its days in a third row", () => {
		const { nav } = render("Journal/2025-W39.md");
		const rows = [...nav.querySelectorAll(".pnn-row")];
		expect(rows.map((row) => accessibleName(row))).to.deep.equal([
			"Parent notes",
			"Nearby weekly notes",
			"weekly note contents",
		]);
		expect(
			[...rows[2].querySelectorAll(".pnn-item .pnn-label")].map(
				(el) => el.textContent
			)
		).to.deep.equal([
			"Monday",
			"Tuesday",
			"Wednesday",
			"Thursday",
			"Friday",
			"Saturday",
			"Sunday",
		]);
		expect(rows[2].querySelectorAll(".pnn-missing").length).to.equal(5);
	});

	it("the position setting decides the class and where the bar is inserted", () => {
		const top = render("Journal/2025-09-26.md");
		expect(top.nav.classList.contains("pnn-position-top")).to.be.true;
		expect(top.container.firstElementChild).to.equal(top.nav);

		const bottom = render("Journal/2025-09-26.md", { position: "bottom" });
		expect(bottom.nav.classList.contains("pnn-position-bottom")).to.be.true;
		expect(bottom.container.lastElementChild).to.equal(bottom.nav);
	});

	it("the bar is created in the document it will live in", () => {
		// A note in a pop-out window has a document of its own, so the bar must be
		// built through its container rather than the main window's document.
		const { nav, container } = render("Journal/2025-09-26.md");
		expect(nav.ownerDocument).to.equal(container.ownerDocument);
	});

	it("nothing in the bar carries a tooltip", () => {
		// Obsidian renders a hover tooltip for any element with an aria-label, and
		// the browser does the same for title, so the bar must use neither.
		for (const path of ["Journal/2025-09-26.md", "Journal/2025-W39.md"]) {
			const { nav } = render(path);
			expect(nav.querySelectorAll("[aria-label], [title]").length).to.equal(0);
			expect(nav.matches("[aria-label], [title]")).to.equal(false);
		}
	});
});
