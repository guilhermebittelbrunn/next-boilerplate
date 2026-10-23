import type { globalTranslations } from "@repo/internationalization/translations/global";
import { z } from "zod";

type Dictionary = (typeof globalTranslations)[keyof typeof globalTranslations];

/** Mirrors the API's ceiling, so the form refuses what the server would refuse. */
const INVITATION_EMAIL_MAX = 254;

export function buildInviteMemberFormSchema(dictionary: Dictionary) {
    const validation =
        dictionary.apps.app.pages.common.organization.invite.validation;

    return z.object({
        email: z
            .string()
            .trim()
            .min(1, validation.required)
            .max(INVITATION_EMAIL_MAX, validation.invalid)
            .email(validation.invalid),
    });
}

export type InviteMemberFormValues = z.infer<
    ReturnType<typeof buildInviteMemberFormSchema>
>;
