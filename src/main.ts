import {
	Keymap,
	MarkdownView,
	Notice,
	Plugin,
	TAbstractFile,
	TFile,
	debounce,
	moment,
	normalizePath,
} from "obsidian";
import { mergeSettings, type PeriodicNavSettings } from "./settings";
import { addPeriods, getParents } from "./periods";
import {
	applyTemplate,
	matchPeriodicNote,
	weekOptionsFor,
	type PeriodMatch,
} from "./paths";
import { buildNavModel, createLink, type NavLink } from "./model";
import { NAVBAR_CLASS, renderNavbar } from "./navbar";
import { PeriodicNavSettingTab } from "./settings-tab";

export default class PeriodicNotesNavPlugin extends Plugin {
	settings: PeriodicNavSettings = mergeSettings({});

	private refresh = debounce(() => this.refreshAll(), 50, true);
	private refreshOnVaultChange = debounce(() => this.refreshAll(), 300, false);

	async onload(): Promise<void> {
		await this.loadSettings();
		this.addSettingTab(new PeriodicNavSettingTab(this.app, this));

		this.registerEvent(
			this.app.workspace.on("file-open", () => this.refresh())
		);
		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => this.refresh())
		);
		this.registerEvent(
			this.app.workspace.on("layout-change", () => this.refresh())
		);

		this.addCommands();

		this.app.workspace.onLayoutReady(() => {
			// Registered here rather than in onload: Obsidian fires "create" for
			// every file in the vault while it starts up, and none of those are
			// worth reacting to.
			const onVaultChange = (file: TAbstractFile) => {
				if (file.path.endsWith(".md")) this.refreshOnVaultChange();
			};
			this.registerEvent(this.app.vault.on("create", onVaultChange));
			this.registerEvent(this.app.vault.on("delete", onVaultChange));
			this.registerEvent(this.app.vault.on("rename", onVaultChange));

			this.refreshAll();
		});
	}

	onunload(): void {
		this.removeAllNavbars();
	}

	async loadSettings(): Promise<void> {
		this.settings = mergeSettings(await this.loadData());
	}

	/** Called when data.json changes on disk, for example through Obsidian Sync. */
	async onExternalSettingsChange(): Promise<void> {
		await this.loadSettings();
		this.refreshAll();
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		this.refreshAll();
	}

	// --- rendering ---------------------------------------------------------

	refreshAll(): void {
		for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
			const view = leaf.view;
			if (view instanceof MarkdownView) this.renderForView(view);
		}
	}

	private removeAllNavbars(): void {
		// Every leaf, not the main document: a note open in a pop-out window
		// lives in a document of its own.
		this.app.workspace.iterateAllLeaves((leaf) => {
			leaf.view.containerEl
				.querySelectorAll(`.${NAVBAR_CLASS}`)
				.forEach((el) => el.detach());
		});
	}

	private renderForView(view: MarkdownView): void {
		const container =
			view.containerEl.querySelector<HTMLElement>(".view-content");
		if (!container) return;

		const existing = container.querySelector<HTMLElement>(`.${NAVBAR_CLASS}`);
		const match = view.file
			? matchPeriodicNote(view.file.path, this.settings)
			: null;

		if (!this.settings.enabled || !match) {
			existing?.detach();
			return;
		}

		const model = buildNavModel(match, this.settings, (path) =>
			this.fileExists(path)
		);
		const signature = [
			this.settings.position,
			model.key,
			...[
				...model.breadcrumbs,
				model.previous,
				model.current,
				model.next,
				...model.children,
			].map((link) =>
				link ? `${link.path}|${link.label}|${link.exists ? 1 : 0}` : "-"
			),
		].join("~");

		// Nothing changed since the last render, so leave the DOM alone.
		if (existing && existing.dataset.signature === signature) return;

		existing?.detach();
		const navbar = renderNavbar(
			container,
			model,
			this.settings,
			(link, evt) => void this.openLink(link, evt)
		);
		if (navbar) navbar.dataset.signature = signature;
	}

	private fileExists(path: string): boolean {
		return this.app.vault.getFileByPath(path) !== null;
	}

	// --- navigation --------------------------------------------------------

	async openLink(
		link: NavLink,
		evt?: MouseEvent | KeyboardEvent
	): Promise<void> {
		const existing = this.app.vault.getFileByPath(link.path);
		let file: TFile;

		if (existing) {
			file = existing;
		} else {
			if (!this.settings.createMissingNotes) {
				new Notice(`${link.label} does not exist yet.`);
				return;
			}
			try {
				file = await this.createNote(link);
			} catch (error) {
				new Notice(
					`Could not create ${link.path}: ${
						error instanceof Error ? error.message : String(error)
					}`
				);
				return;
			}
		}

		const leaf = this.app.workspace.getLeaf(
			evt ? Keymap.isModEvent(evt) : false
		);
		await leaf.openFile(file);
	}

	private async createNote(link: NavLink): Promise<TFile> {
		const slash = link.path.lastIndexOf("/");
		if (slash > 0) await this.ensureFolder(link.path.slice(0, slash));

		const basename = link.path.slice(slash + 1, -3);
		let content = "";

		const template = this.settings.periods[link.key].template.trim();
		if (template) {
			const templatePath = normalizePath(
				template.endsWith(".md") ? template : `${template}.md`
			);
			const templateFile = this.app.vault.getFileByPath(templatePath);
			if (templateFile) {
				content = applyTemplate(
					await this.app.vault.cachedRead(templateFile),
					link.date,
					basename,
					moment()
				);
			} else {
				new Notice(`Template not found: ${templatePath}`);
			}
		}

		return await this.app.vault.create(link.path, content);
	}

	private async ensureFolder(folder: string): Promise<void> {
		const parts = folder.split("/").filter(Boolean);
		let path = "";
		for (const part of parts) {
			path = path ? `${path}/${part}` : part;
			if (this.app.vault.getFolderByPath(path)) continue;
			if (this.app.vault.getFileByPath(path)) {
				throw new Error(`${path} is a file, not a folder`);
			}
			await this.app.vault.createFolder(path);
		}
	}

	// --- commands ----------------------------------------------------------

	private currentMatch(): PeriodMatch | null {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view?.file) return null;
		return matchPeriodicNote(view.file.path, this.settings);
	}

	private addCommands(): void {
		const step = (id: string, name: string, amount: number) =>
			this.addCommand({
				id,
				name,
				checkCallback: (checking) => {
					const match = this.currentMatch();
					if (!match) return false;
					if (!checking) {
						const date = addPeriods(
							match.date,
							match.key,
							amount,
							weekOptionsFor(this.settings)
						);
						void this.openLink(
							createLink(match.key, date, this.settings, (path) =>
								this.fileExists(path)
							)
						);
					}
					return true;
				},
			});

		step("previous-periodic-note", "Open previous periodic note", -1);
		step("next-periodic-note", "Open next periodic note", 1);

		this.addCommand({
			id: "parent-periodic-note",
			name: "Open parent periodic note",
			checkCallback: (checking) => {
				const match = this.currentMatch();
				if (!match) return false;
				const parent = getParents(
					match.date,
					match.key,
					weekOptionsFor(this.settings)
				)
					.filter((candidate) => this.settings.periods[candidate.key].enabled)
					.pop();
				if (!parent) return false;
				if (!checking) {
					void this.openLink(
						createLink(parent.key, parent.date, this.settings, (path) =>
							this.fileExists(path)
						)
					);
				}
				return true;
			},
		});

		this.addCommand({
			id: "toggle-navbar",
			name: "Toggle navigation bar",
			callback: () => {
				this.settings.enabled = !this.settings.enabled;
				new Notice(
					this.settings.enabled
						? "Periodic notes navigation bar shown"
						: "Periodic notes navigation bar hidden"
				);
				void this.saveSettings();
			},
		});

		this.addCommand({
			id: "open-todays-note",
			name: "Open today's daily note",
			checkCallback: (checking) => {
				if (!this.settings.periods.daily.enabled) return false;
				if (!checking) {
					void this.openLink(
						createLink("daily", moment(), this.settings, (path) =>
							this.fileExists(path)
						)
					);
				}
				return true;
			},
		});
	}
}
