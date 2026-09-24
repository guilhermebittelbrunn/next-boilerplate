import {
    type AdvanceOnboardingRequest,
    ONBOARDING_STEPS,
    type OnboardingState,
    type OnboardingStateDTO,
    type OnboardingStepId,
} from "@repo/sdk/src/types";

export type OnboardingTransition =
    | { kind: "unchanged" }
    | { kind: "out-of-order" }
    | { kind: "not-skippable" }
    | { kind: "advanced"; state: OnboardingState };

export function initialOnboardingState(): OnboardingState {
    return { step: ONBOARDING_STEPS[0].id, completedAt: null };
}

function stepIndex(step: unknown): number {
    const index = ONBOARDING_STEPS.findIndex(({ id }) => id === step);
    return index === -1 ? 0 : index;
}

function toIsoInstant(value: unknown): string | null {
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value.toISOString();
    }
    if (typeof value === "string") {
        return Number.isNaN(Date.parse(value)) ? null : value;
    }
    const maybeTimestamp = value as { toDate?: () => Date } | null | undefined;
    if (typeof maybeTimestamp?.toDate === "function") {
        return maybeTimestamp.toDate().toISOString();
    }
    return null;
}

/**
 * `null` for an absent or malformed field, which callers read as "nothing left to do": a
 * profile that cannot be understood is let through rather than held on a screen that
 * cannot render. A stored step that is no longer in the list reads as the first one.
 */
export function toOnboardingStateDTO(raw: unknown): OnboardingStateDTO | null {
    if (typeof raw !== "object" || raw === null) {
        return null;
    }

    const { step, completedAt } = raw as {
        step?: unknown;
        completedAt?: unknown;
    };
    const normalizedStep: OnboardingStepId =
        ONBOARDING_STEPS[stepIndex(step)].id;

    if (completedAt === null) {
        return { step: normalizedStep, completedAt: null };
    }

    const completedAtIso = toIsoInstant(completedAt);
    if (!completedAtIso) {
        return null;
    }

    return { step: normalizedStep, completedAt: completedAtIso };
}

/**
 * The state only moves forward. A request for a step behind the current one is a stale
 * tab and gets the current state back; one ahead of it can only come from a forged body.
 */
export function advanceOnboardingState(
    current: unknown,
    request: AdvanceOnboardingRequest,
    now: Date
): OnboardingTransition {
    const state = toOnboardingStateDTO(current);
    if (!state || state.completedAt !== null) {
        return { kind: "unchanged" };
    }

    const currentIndex = stepIndex(state.step);
    const requestedIndex = stepIndex(request.step);

    if (requestedIndex < currentIndex) {
        return { kind: "unchanged" };
    }
    if (requestedIndex > currentIndex) {
        return { kind: "out-of-order" };
    }
    if (
        request.outcome === "skipped" &&
        !ONBOARDING_STEPS[currentIndex].skippable
    ) {
        return { kind: "not-skippable" };
    }

    const nextStep = ONBOARDING_STEPS[currentIndex + 1];
    if (nextStep) {
        return {
            kind: "advanced",
            state: { step: nextStep.id, completedAt: null },
        };
    }

    return {
        kind: "advanced",
        state: { step: ONBOARDING_STEPS[currentIndex].id, completedAt: now },
    };
}
