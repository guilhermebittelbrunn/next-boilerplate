import { keys as auth } from "@repo/auth/keys";
import { keys as email } from "@repo/email/keys";
import { keys as core } from "@repo/next-config/keys";
import { keys as payments } from "@repo/payments/keys";
import { createEnv } from "@t3-oss/env-nextjs";

export const env = createEnv({
  extends: [
    auth(),
    core(),
    email(),
    payments(),
  ],
  server: {},
  client: {},
  runtimeEnv: {},
  skipValidation: process.env.NODE_ENV === "development",
});
