import { expect } from "chai";

/**
 * Asserts a value is neither null nor undefined and narrows it for the code
 * that follows. Chai's `expect` makes no claim about types on its own.
 */
export function assertExists<T>(
	value: T | null | undefined,
	message = "expected a value"
): asserts value is T {
	expect(value, message).to.not.be.null;
	expect(value, message).to.not.be.undefined;
}
