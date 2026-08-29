import { browser } from "@wdio/globals";

export const PLUGIN_ID = "periodic-notes-nav";

/**
 * The navigation bar in the active markdown pane, if the plugin rendered one.
 * Scoped to the active leaf: a note in another tab has a bar of its own.
 */
export function navbar() {
	return browser.$(".workspace-leaf.mod-active .view-content .pnn-navbar");
}

/** Visible text of every element matching a selector inside the bar. */
export async function labels(selector: string): Promise<string[]> {
	return await navbar()
		.$$(selector)
		.map((el) => el.getText());
}

/** Path of the file showing in the active markdown view. */
export function activeFilePath(): Promise<string | undefined> {
	return browser.executeObsidian(({ app, obsidian }) => {
		const view = app.workspace.getActiveViewOfType(obsidian.MarkdownView);
		return view?.file?.path;
	});
}

/** Whether a note exists in the vault. */
export function fileExists(path: string): Promise<boolean> {
	return browser.executeObsidian(
		({ app }, target) => app.vault.getFileByPath(target) !== null,
		path
	);
}

/**
 * Waits out the plugin's 50ms leading-edge refresh debounce before asserting
 * that no bar appeared. A plain negative assertion would pass before the
 * plugin ever had a chance to render one.
 */
export async function settle(): Promise<void> {
	await browser.pause(300);
}
