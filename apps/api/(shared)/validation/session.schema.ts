import { z } from "zod";

/** The id is the sign-in instant in seconds. */
const sessionIdSchema = z.string().regex(/^\d{1,12}$/);

/** A malformed id reads as a session that does not exist. */
export function parseSessionId(raw: string): string | null {
    const parsed = sessionIdSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
}
