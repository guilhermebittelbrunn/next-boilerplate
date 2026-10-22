import { canSendAuthActionLink } from "@/(shared)/lib/auth-action-links";
import { env } from "@/env";

export const isEmailLinkSignInEnabled = (): boolean =>
    env.EMAIL_LINK_SIGN_IN_ENABLED?.trim().toLowerCase() === "true";

export const isEmailLinkSignInAvailable = (): boolean =>
    isEmailLinkSignInEnabled() && canSendAuthActionLink();
