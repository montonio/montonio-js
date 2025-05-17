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
