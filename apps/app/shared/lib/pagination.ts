/**
 * Page sizes live here, away from the data hooks, so a Server Component can prefetch with
 * the same size without pulling the browser-side API client into its bundle.
 */
export const ENTITIES_PAGE_SIZE = 20;
