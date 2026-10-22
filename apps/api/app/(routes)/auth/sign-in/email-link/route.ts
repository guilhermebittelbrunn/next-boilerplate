import { isEmailLinkSignInAvailable } from "@/(shared)/lib/email-link-sign-in";

// Without this the answer is computed once at build time and frozen, while it describes
// the configuration of the running process.
export const dynamic = "force-dynamic";

/**
 * Switched off is a description of the environment, not a failure: the sign-in screen
 * shows what it showed before the link existed.
 */
export function GET() {
    return Response.json({ data: { enabled: isEmailLinkSignInAvailable() } });
}
