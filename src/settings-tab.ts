import { App, PluginSettingTab, Setting, moment } from "obsidian";
import type PeriodicNotesNavPlugin from "./main";
import {
	PERIODS,
	PERIOD_ORDER,
	type PeriodKey,
	type WeekStart,
} from "./settings";
import { noteLabel, notePath } from "./paths";
import { usesIsoWeeks } from "./periods";

const FORMAT_DOCS = "https://momentjs.com/docs/#/displaying/format/";

function formatHint(text: string): DocumentFragment {
	return createFragment((fragment) => {
		fragment.appendText(text + " ");
		fragment.createEl("a", {
			text: "Date format reference",
			href: FORMAT_DOCS,
		});
	});
}

export class PeriodicNavSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private plugin: PeriodicNotesNavPlugin
	) {
		super(app, plugin);
	}

	/**
	 * Obsidian marks `display()` as deprecated since 1.13.0 in favour of the
	 * declarative `getSettingDefinitions()`, but that API needs 1.13.0 and this
	 * plugin supports 1.5.7 upwards. The API documents `display()` as the
	 * supported fallback for exactly that case, so this is deliberate; revisit
	 * once requiring 1.13 is reasonable.
	 */
	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.addClass("pnn-settings");

		this.addGeneralSettings();
		this.addAppearanceSettings();
		for (const key of PERIOD_ORDER) this.addPeriodSettings(key);
	}

	private save(): void {
		void this.plugin.saveSettings();
	}

	private addGeneralSettings(): void {
		const { containerEl } = this;
		const settings = this.plugin.settings;

		new Setting(containerEl)
			.setName("Show navigation bar")
			.setDesc("Turn the navigation bar on or off in every periodic note.")
			.addToggle((toggle) =>
				toggle.setValue(settings.enabled).onChange((value) => {
					settings.enabled = value;
					this.save();
				})
			);

		new Setting(containerEl)
			.setName("Position")
			.setDesc(
				"Where the bar sits in the note view. The bottom position keeps it within thumb reach on a phone."
			)
			.addDropdown((dropdown) =>
				dropdown
					.addOptions({ top: "Top of the note", bottom: "Bottom of the note" })
					.setValue(settings.position)
					.onChange((value) => {
						settings.position = value === "bottom" ? "bottom" : "top";
						this.save();
					})
			);

		new Setting(containerEl)
			.setName("First day of the week")
			.setDesc(
				"Decides where weeks start when working out weekly notes. Ignored when the weekly file name format uses ISO week tokens (W, WW, GGGG), which always start on Monday."
			)
			.addDropdown((dropdown) =>
				dropdown
					.addOptions({
						locale: "Follow Obsidian's language",
						monday: "Monday",
						sunday: "Sunday",
					})
					.setValue(settings.weekStart)
					.onChange((value) => {
						settings.weekStart = value as WeekStart;
						this.save();
						this.display();
					})
			);

		new Setting(containerEl)
			.setName("Notes that do not exist yet")
			.setDesc(
				"Links to notes you have not written yet can be shown dimmed, or left out entirely."
			)
			.addDropdown((dropdown) =>
				dropdown
					.addOptions({ muted: "Show them dimmed", hidden: "Hide them" })
					.setValue(settings.missingNotes)
					.onChange((value) => {
						settings.missingNotes = value === "hidden" ? "hidden" : "muted";
						this.save();
					})
			);

		new Setting(containerEl)
			.setName("Create missing notes on click")
			.setDesc(
				"Opening a dimmed link creates the note, using that period's template when one is set."
			)
			.addToggle((toggle) =>
				toggle.setValue(settings.createMissingNotes).onChange((value) => {
					settings.createMissingNotes = value;
					this.save();
				})
			);
	}

	private addAppearanceSettings(): void {
		const { containerEl } = this;
		const settings = this.plugin.settings;

		new Setting(containerEl).setName("Rows").setHeading();

		new Setting(containerEl)
			.setName("Parent notes")
			.setDesc(
				"The breadcrumb row, for example 2025 / Q3 / September / Week 39."
			)
			.addToggle((toggle) =>
				toggle.setValue(settings.showBreadcrumbs).onChange((value) => {
					settings.showBreadcrumbs = value;
					this.save();
				})
			);

		new Setting(containerEl)
			.setName("Previous and next")
			.setDesc("The row that steps one period backwards or forwards.")
			.addToggle((toggle) =>
				toggle.setValue(settings.showSiblings).onChange((value) => {
					settings.showSiblings = value;
					this.save();
				})
			);

		new Setting(containerEl)
			.setName("Contained notes")
			.setDesc(
				"The row listing the shorter periods inside this one, for example the days of a week."
			)
			.addToggle((toggle) =>
				toggle.setValue(settings.showChildren).onChange((value) => {
					settings.showChildren = value;
					this.save();
				})
			);

		new Setting(containerEl)
			.setName("Arrows")
			.setDesc("Show ❮ and ❯ next to the previous and next links.")
			.addToggle((toggle) =>
				toggle.setValue(settings.showArrows).onChange((value) => {
					settings.showArrows = value;
					this.save();
				})
			);

		const separator = (
			name: string,
			desc: string,
			get: () => string,
			set: (value: string) => void
		) =>
			new Setting(containerEl)
				.setName(name)
				.setDesc(desc)
				.addText((text) =>
					text
						.setValue(get())
						.setPlaceholder("none")
						.onChange((value) => {
							set(value);
							this.save();
						})
				);

		separator(
			"Parent separator",
			"Placed between the parent links.",
			() => settings.breadcrumbSeparator,
			(value) => (settings.breadcrumbSeparator = value)
		);
		separator(
			"Previous and next separator",
			"Placed around the current note.",
			() => settings.siblingSeparator,
			(value) => (settings.siblingSeparator = value)
		);
		separator(
			"Contained notes separator",
			"Placed between the contained notes.",
			() => settings.childSeparator,
			(value) => (settings.childSeparator = value)
		);
	}

	private addPeriodSettings(key: PeriodKey): void {
		const { containerEl } = this;
		const settings = this.plugin.settings;
		const period = settings.periods[key];
		const meta = PERIODS[key];

		new Setting(containerEl).setName(`${meta.name} notes`).setHeading();

		new Setting(containerEl)
			.setName(`Enable ${meta.name.toLowerCase()} notes`)
			.setDesc(
				`Include ${meta.noun}s in the navigation bar. Turn this off if you do not keep them.`
			)
			.addToggle((toggle) =>
				toggle.setValue(period.enabled).onChange((value) => {
					period.enabled = value;
					this.save();
					this.display();
				})
			);

		if (!period.enabled) return;

		const preview = containerEl.createDiv({ cls: "pnn-settings-preview" });
		const updatePreview = () => {
			preview.empty();
			const now = moment();
			try {
				preview.createDiv({
					cls: "pnn-settings-preview-line",
					text: `Today's ${meta.noun}: ${notePath(key, now, settings)}`,
				});
				preview.createDiv({
					cls: "pnn-settings-preview-line",
					text: `Shown in the bar as: ${noteLabel(key, now, settings)}`,
				});
				// ISO weeks and locale weeks can number the same week differently,
				// so a note called 2025-W01 should not be labelled with a locale
				// week number.
				if (
					key === "weekly" &&
					period.label &&
					usesIsoWeeks(period.format) !== usesIsoWeeks(period.label)
				) {
					preview.createDiv({
						cls: "pnn-settings-preview-line mod-warning",
						text: "The file name and the label use different week numbering (W and GGGG are ISO, w and gggg follow the locale). They can disagree at the turn of the year.",
					});
				}
			} catch (error) {
				preview.createDiv({
					cls: "pnn-settings-preview-line mod-warning",
					text: `That format cannot be used: ${
						error instanceof Error ? error.message : String(error)
					}`,
				});
			}
		};

		new Setting(containerEl)
			.setName("Folder")
			.setDesc(
				formatHint(
					"Where these notes live. Leave empty for the vault root. Accepts date placeholders such as {{date:YYYY}}/{{date:MM}}."
				)
			)
			.addText((text) =>
				text
					.setPlaceholder("Journal/{{date:YYYY}}")
					.setValue(period.folder)
					.onChange((value) => {
						period.folder = value;
						updatePreview();
						this.save();
					})
			);

		new Setting(containerEl)
			.setName("File name format")
			.setDesc(
				formatHint(
					"Date format of the file name, without the .md extension. This is also how the plugin recognises the note."
				)
			)
			.addText((text) =>
				text
					.setPlaceholder("YYYY-MM-DD")
					.setValue(period.format)
					.onChange((value) => {
						period.format = value;
						updatePreview();
						this.save();
					})
			);

		new Setting(containerEl)
			.setName("Label format")
			.setDesc(
				formatHint(
					"Date format used for this note's links in the bar. Wrap plain words in square brackets, for example [Week] w."
				)
			)
			.addText((text) =>
				text
					.setPlaceholder(meta.key === "weekly" ? "[Week] w" : "YYYY-MM-DD")
					.setValue(period.label)
					.onChange((value) => {
						period.label = value;
						updatePreview();
						this.save();
					})
			);

		new Setting(containerEl)
			.setName("Template")
			.setDesc(
				"Optional file whose contents are used when a missing note is created. Supports {{title}}, {{date}}, {{date:FORMAT}} and {{time}}."
			)
			.addText((text) =>
				text
					.setPlaceholder("Templates/Daily.md")
					.setValue(period.template)
					.onChange((value) => {
						period.template = value;
						this.save();
					})
			);

		containerEl.appendChild(preview);
		updatePreview();
	}
}
