import { env } from "@/env";

/** Only "true" turns members and invitations on; empty, absent or anything else keeps them off. */
export const isOrganizationMembersEnabled = (): boolean =>
    env.NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED?.trim().toLowerCase() ===
    "true";
