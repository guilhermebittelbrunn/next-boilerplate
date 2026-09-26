/** Length is the only rule: no composition requirements (OWASP ASVS 5.0, 6.2.1 and 6.2.5). */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 1024;

/**
 * Accounts created before the length policy may hold passwords of 6 or 7 characters, and
 * Firebase never accepted fewer than 6. Anything that checks a password someone already
 * has (sign-in, current-password confirmation) must keep accepting them.
 */
export const EXISTING_PASSWORD_MIN_LENGTH = 6;
