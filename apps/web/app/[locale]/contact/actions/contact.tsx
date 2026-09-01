"use server";

import { resend } from "@repo/email";
import { ContactTemplate } from "@repo/email/templates/contact";
import { env } from "@/env";

const parseError = (error: unknown): string => {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === "string") {
        return error;
    }
    return "An unknown error occurred";
};

export const contact = async (
    name: string,
    email: string,
    message: string
): Promise<{
    error?: string;
}> => {
    try {
        if (!(env.RESEND_FROM && env.RESEND_TOKEN)) {
            throw new Error("Resend environment variables not configured.");
        }

        await resend.emails.send({
            from: env.RESEND_FROM,
            to: env.RESEND_FROM,
            subject: "Contact form submission",
            replyTo: email,
            react: (
                <ContactTemplate email={email} message={message} name={name} />
            ),
        });

        return {};
    } catch (error) {
        const errorMessage = parseError(error);
        return { error: errorMessage };
    }
};
