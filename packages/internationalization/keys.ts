import { z } from "zod";

const internationalizationKeysSchema = z.object({
    LANGUNE_API_KEY: z.string().optional(),
    LANGUNE_PROJECT_ID: z.string().optional(),
});

export const keys = () => {
    const env = {
        LANGUNE_API_KEY: process.env.LANGUNE_API_KEY,
        LANGUNE_PROJECT_ID: process.env.LANGUNE_PROJECT_ID,
    };

    // Only validate if keys are present
    if (!(env.LANGUNE_API_KEY || env.LANGUNE_PROJECT_ID)) {
        return {
            LANGUNE_API_KEY: undefined,
            LANGUNE_PROJECT_ID: undefined,
        };
    }

    return internationalizationKeysSchema.parse(env);
};
