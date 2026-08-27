/**
 * Loaded by Mocha before any spec, so the Obsidian DOM helpers exist by the
 * time the modules under test are imported.
 */
import { setupDom } from "./stubs/dom";

setupDom();
