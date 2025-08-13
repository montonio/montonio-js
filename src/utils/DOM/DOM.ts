/**
 * DOM utils for selecting elements and manipulating the DOM
 */

/**
 * Get an element from a CSS selector or HTMLElement
 * @param selector CSS selector string or HTMLElement
 * @returns HTMLElement
 * @throws Error if element is not found
 */
export function getElement(selector: string | HTMLElement): HTMLElement {
    if (typeof selector === 'string') {
        const element = document.querySelector(selector);
        if (!element || !(element instanceof HTMLElement)) {
            throw new Error(`Element not found: ${selector}`);
        }
        return element;
    }

    return selector;
}

/**
 * Set 'overflow: hidden' on the document body and return the original value which can be used to restore it later
 * @returns object with the original overflow value
 */
export function disableBodyScroll(): { originalOverflow: string | null } {
    const originalOverflow = document.body.style.overflow || null;
    document.body.style.overflow = 'hidden';
    return { originalOverflow };
}

/**
 * Restore the body overflow to its original value
 */
export function restoreBodyOverflow(originalOverflow: string | null): void {
    if (originalOverflow) {
        document.body.style.overflow = originalOverflow;
    } else {
        // Remove the style attribute if it was empty originally
        document.body.style.removeProperty('overflow');
    }
}
