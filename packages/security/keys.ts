import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * The key is optional and the example env files ship it declared but empty, so an
 * empty value has to mean "absent" — otherwise merely copying `.env.example`
 * refuses the schema and takes down every app that imports this package.
 */
const optionalArcjetKey = z.preprocess((value) => {
    if (typeof value !== "string") {
        return value;
    }
    const key = value.trim();
    return key === "" ? undefined : key;
}, z.string().startsWith("ajkey_").optional());

export const keys = () =>
    createEnv({
        server: {
            ARCJET_KEY: optionalArcjetKey,
        },
        runtimeEnv: {
            ARCJET_KEY: process.env.ARCJET_KEY,
        },
    });
