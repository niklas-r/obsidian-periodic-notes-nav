/**
 * Stand-in for the parts of the Obsidian API the pure modules use, so the date
 * and path logic can be exercised outside of the app.
 */
import moment from "moment";

export { moment };

export function normalizePath(path: string): string {
	return path
		.replace(/\\/g, "/")
		.replace(/\/{2,}/g, "/")
		.replace(/^\/+|\/+$/g, "")
		.normalize("NFC");
}
