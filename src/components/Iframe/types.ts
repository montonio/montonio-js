export interface IframeOptions {
    /**
     * URL to load in the iframe
     */
    src: string;

    /**
     * Element to mount the iframe to
     */
    mountElement: HTMLElement;

    /**
     * Optional allow attribute for iframe permissions
     * @default 'payment'
     */
    allow?: string;

    /**
     * Optional iframe styles as CSS properties
     */
    styles?: Partial<CSSStyleDeclaration>;

    /**
     * Whether to resize based on height messages from iframe
     * @default true
     */
    resizeOnHeightChange?: boolean;
}
