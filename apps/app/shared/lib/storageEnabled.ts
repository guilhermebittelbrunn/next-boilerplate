import { env } from "@/env";

export const isStorageEnabled = (): boolean =>
    Boolean(env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
