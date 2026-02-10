// import { keys as cms } from "@repo/cms/keys";
import { keys as email } from "@repo/email/keys";
import { keys as core } from "@repo/next-config/keys";
// import { keys as rateLimit } from "@repo/rate-limit/keys";
import { keys as security } from "@repo/security/keys";
import { createEnv } from "@t3-oss/env-nextjs";

export const env = createEnv({
    extends: [core(), email(), security()],
    server: {},
    client: {},
    runtimeEnv: {},
    skipValidation: process.env.NODE_ENV === "development",
});
