/**
 * Shared horizontal rhythm.
 *
 * Every page draws its side gutters from here, so pages cannot drift apart.
 * The window starts at 900px wide with a sidebar, so the gutters are tighter
 * than a website's.
 */
export const PAGE_GUTTER = "px-5 lg:px-8 xl:px-12";

/**
 * Full-width pages. The max width stops content sprawling edge to edge on a
 * large display, which is what makes long lines tiring to read.
 */
export const PAGE_CONTAINER = `mx-auto w-full max-w-[88rem] ${PAGE_GUTTER}`;
