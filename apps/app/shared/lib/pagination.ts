/**
 * Page sizes live here, away from the data hooks, so a Server Component can prefetch with
 * the same size without pulling the browser-side API client into its bundle.
 */
export const ENTITIES_PAGE_SIZE = 20;

export const AUDIT_EVENTS_PAGE_SIZE = 20;

export const NOTIFICATIONS_PAGE_SIZE = 10;

/**
 * How often the bell asks for the unread count while the tab is visible. Each request
 * costs about four Firestore reads (three in the guard, one aggregation), so a shorter
 * interval multiplies the free daily quota spent per open tab.
 */
export const NOTIFICATIONS_POLL_INTERVAL_MS = 120_000;
