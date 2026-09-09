import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Both settings are optional and the example env files ship them declared but
 * empty, so an empty value has to mean "absent" — otherwise merely copying
 * `.env.example` refuses the schema and takes down every app that imports this
 * package. A value that is present but malformed still fails, on purpose.
 */
const emptyToUndefined = (value: unknown) => {
    if (typeof value !== "string") {
        return value;
    }
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
};

const emailAddress = z.string().email();
const displayNameSender = /^[^<>]*<([^<>\s]+)>$/;

/**
 * Resend takes the sender both as a bare address and in the `Acme <hi@acme.com>`
 * form its own documentation uses, so refusing the second one would break the
 * boot of every app over a value the provider considers correct.
 */
const isSenderAddress = (value: string): boolean =>
    emailAddress.safeParse(displayNameSender.exec(value)?.[1] ?? value).success;

const optionalSender = z.preprocess(
    emptyToUndefined,
    z
        .string()
        .refine(isSenderAddress, {
            message: 'must be an address, alone or as "Name <address>"',
        })
        .optional()
);

const optionalToken = z.preprocess(
    emptyToUndefined,
    z.string().startsWith("re_").optional()
);

export const keys = () =>
    createEnv({
        server: {
            RESEND_FROM: optionalSender,
            RESEND_TOKEN: optionalToken,
        },
        runtimeEnv: {
            RESEND_FROM: process.env.RESEND_FROM,
            RESEND_TOKEN: process.env.RESEND_TOKEN,
        },
    });
