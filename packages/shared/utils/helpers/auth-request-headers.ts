/** HTTP headers for authenticated request context (SDK ↔ API). */
export const AUTH_REQUEST_HEADER = {
    USER_ID: "x-user-id",
    REQUEST_USER_ID: "x-request-user-id",
    USER_ROLE: "x-user-role",
    REQUEST_ROLE: "x-request-role",
} as const;
