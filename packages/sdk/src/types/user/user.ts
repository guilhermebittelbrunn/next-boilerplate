/** biome-ignore-all lint/style/noEnum: enums for role */
export enum UserType {
    ADMIN = "admin",
    COMMON = "common",
}

export type UserPreferences = {
    theme: "light" | "dark" | "system";
    locale: "pt-br" | "en" | "es";
};

/**
 * The order of the flow. A stored step that a fork later removes is read as the first one,
 * so a profile pointing at a step that no longer exists restarts the flow instead of
 * trapping the user.
 */
export const ONBOARDING_STEPS = [
    { id: "profile", skippable: false },
    { id: "preferences", skippable: true },
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]["id"];

/** `step` is the next step to show, not the last one finished. */
export type OnboardingState = {
    step: OnboardingStepId;
    completedAt: Date | null;
};

export type OnboardingStateDTO = {
    step: OnboardingStepId;
    completedAt: string | null;
};

export type OnboardingStepOutcome = "completed" | "skipped";

export type AdvanceOnboardingRequest = {
    step: OnboardingStepId;
    outcome: OnboardingStepOutcome;
};

export type UserDTO = {
    id: string;
    type: UserType;
    reference_id: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    phone?: string | null;
    avatar?: string | null;
    preferences?: UserPreferences | null;
    /**
     * Stamped by the API on authenticated requests, once per activity window, so it trails
     * real use by up to that window. Requests racing on a profile that has no stamp yet can
     * each write once. Absent on profiles that predate the field.
     */
    lastAccessAt?: Date | null;
    /** Absent on profiles that predate the flow, which count as done. */
    onboarding?: OnboardingState | null;
};

export type AdminCreateUserRequest = {
    email: string;
    password: string;
    type: UserType;
    displayName?: string;
};

export type AdminUpdateUserRequest = {
    id: string;
    type?: UserType;
    displayName?: string | null;
    disabled?: boolean;
};

/**
 * Counted straight from the profile collection, with no Firebase Auth join. A profile
 * whose Auth account was deleted outside the app is dropped from `GET /users` but still
 * counted here, so the total can exceed the number of rows in the admin listing.
 */
export type UserSummaryDTO = {
    total: number;
    byType: Record<UserType, number>;
};

export type UserWithAuthDTO = UserDTO & {
    uid: string;
    email: string | null;
    emailVerified: boolean;
    displayName: string | null;
    photoURL: string | null;
    phoneNumber: string | null;
    disabled: boolean;
    metadata: {
        creationTime: string;
        lastSignInTime: string;
        lastRefreshTime?: string | null;
    };
    providerData: Array<{
        providerId: string;
        uid: string;
        displayName: string | null;
        email: string | null;
        phoneNumber: string | null;
    }>;
    customClaims: Record<string, unknown> | null;
    tokensValidAfterTime?: string;
};

export type UserActivityBucket =
    | "last7Days"
    | "from8To30Days"
    | "from31To90Days"
    | "over90Days"
    | "never";

/**
 * Counted from `lastAccessAt`, which the API stamps once per activity window, so every
 * number here trails real use by up to `thresholds.precisionMinutes`. A profile that was
 * never stamped carries no field at all and falls out of every range query, which is why
 * `never` is derived from the total instead of counted.
 */
export type UserActivitySummaryDTO = {
    active: number;
    inactive: number;
    byRecency: Record<UserActivityBucket, number>;
    thresholds: {
        activeDays: number;
        inactiveDays: number;
        precisionMinutes: number;
    };
};
