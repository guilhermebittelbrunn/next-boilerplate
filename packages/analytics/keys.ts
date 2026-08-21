import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const keys = () =>
    createEnv({
        client: {
            NEXT_PUBLIC_GA_MEASUREMENT_ID: z.preprocess((val) => {
                if (typeof val !== "string") {
                    return;
                }
                const id = val.trim();
                return id.startsWith("G-") ? id : undefined;
            }, z.string().optional()),
        },
        runtimeEnv: {
            NEXT_PUBLIC_GA_MEASUREMENT_ID:
                process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
        },
    });
