import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const ARCJET_KEY_PREFIX = "ajkey_";

export type ArcjetKeyState = "absent" | "malformed" | "valid";

const trimmedString = (value: unknown): string =>
    typeof value === "string" ? value.trim() : "";

export const arcjetKeyState = (value: unknown): ArcjetKeyState => {
    const key = trimmedString(value);
    if (key === "") {
        return "absent";
    }
    return key.startsWith(ARCJET_KEY_PREFIX) ? "valid" : "malformed";
};

/**
 * Never throws: a key without the Arcjet prefix reads as no key at all, so the limiter
 * degrades to a no-op instead of failing every request that imports this package.
 */
export const readArcjetKey = (
    value: unknown = process.env.ARCJET_KEY
): string | undefined =>
    arcjetKeyState(value) === "valid" ? trimmedString(value) : undefined;

/**
 * The key is optional and the example env files ship it declared but empty, so an
 * empty value has to mean "absent" — otherwise merely copying `.env.example`
 * refuses the schema and takes down every app that imports this package.
 * A present key without the prefix is still refused here, so the build of an app that
 * extends this schema fails on it instead of shipping with bot protection silently off.
 */
const optionalArcjetKey = z.preprocess((value) => {
    if (typeof value !== "string") {
        return value;
    }
    const key = value.trim();
    return key === "" ? undefined : key;
}, z.string().startsWith(ARCJET_KEY_PREFIX).optional());

export const keys = () =>
    createEnv({
        server: {
            ARCJET_KEY: optionalArcjetKey,
        },
        runtimeEnv: {
            ARCJET_KEY: process.env.ARCJET_KEY,
        },
    });
