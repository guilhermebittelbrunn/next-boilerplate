"use server";

import { ownerInbox, sendEmail } from "@repo/email";
import { contactEmail } from "@repo/email/templates/contact";
import { getDictionary } from "@repo/internationalization/server";

export const contact = async (
    name: string,
    email: string,
    message: string
): Promise<{
    error?: string;
}> => {
    const { locale } = await getDictionary();

    await sendEmail({
        template: contactEmail,
        to: ownerInbox(),
        replyTo: email,
        locale,
        data: { name, email, message },
    });

    return {};
};
