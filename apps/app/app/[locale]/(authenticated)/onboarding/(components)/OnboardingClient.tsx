"use client";

import { Card } from "@repo/design-system/components/ui/card";
import { Progress } from "@repo/design-system/components/ui/progress";
import { getDictionary } from "@repo/internationalization/client";
import {
    ONBOARDING_STEPS,
    type OnboardingStateDTO,
    type OnboardingStepId,
} from "@repo/sdk/src/types";
import { setCookie } from "@repo/shared/utils";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Container } from "@/shared/components/ui/Container";
import { FormSkeleton } from "@/shared/components/ui/FormSkeleton";
import { useMyAccount } from "@/shared/hooks/useMyAccount";
import {
    onboardingStepIndex,
    withDestinationLocale,
} from "@/shared/lib/onboarding";
import { PREFERENCE_COOKIE_TTL_SECONDS } from "@/shared/lib/themePreference";
import {
    type AdvanceOnboardingVariables,
    useOnboardingMutations,
} from "../(hooks)/useOnboardingMutations";
import type { OnboardingLocale } from "../(validations)/onboardingFormSchema";
import { OnboardingPreferencesStep } from "./OnboardingPreferencesStep";
import { OnboardingProfileStep } from "./OnboardingProfileStep";

const FULL_PROGRESS = 100;

type OnboardingClientProps = {
    initialStep: OnboardingStepId;
    destination: string;
};

export function OnboardingClient({
    initialStep,
    destination,
}: OnboardingClientProps) {
    const { dictionary, locale } = getDictionary();
    const onboardingCopy = dictionary.apps.app.pages.onboarding;
    const router = useRouter();
    const { data: account, isLoading, isError } = useMyAccount();
    const [step, setStep] = useState<OnboardingStepId>(initialStep);
    const { advanceOnboardingMutation } = useOnboardingMutations({
        onConflict: () => setStep(initialStep),
    });
    const inFlightRef = useRef(false);

    const stepIndex = onboardingStepIndex(step);
    const totalSteps = ONBOARDING_STEPS.length;
    const isLastStep = stepIndex === totalSteps - 1;
    const confirmLabel = isLastStep
        ? onboardingCopy.actions.finish
        : onboardingCopy.actions.next;
    const isPending = advanceOnboardingMutation.isPending;

    const finish = (chosenLocale?: OnboardingLocale) => {
        if (chosenLocale && chosenLocale !== locale) {
            // The locale cookie is read on the server for the first paint, so it is
            // written before navigating to the destination in the new language.
            setCookie("x-locale", chosenLocale, PREFERENCE_COOKIE_TTL_SECONDS);
            router.replace(withDestinationLocale(destination, chosenLocale));
            router.refresh();
            return;
        }
        router.replace(destination);
    };

    // A ref, not `isPending`: two clicks in the same frame both read the render in
    // which the mutation had not started yet.
    const advance = (
        variables: AdvanceOnboardingVariables,
        chosenLocale?: OnboardingLocale
    ) => {
        if (inFlightRef.current) {
            return;
        }
        inFlightRef.current = true;
        advanceOnboardingMutation.mutate(variables, {
            onSuccess: (state: OnboardingStateDTO | null) => {
                if (!state || state.completedAt !== null) {
                    finish(chosenLocale);
                    return;
                }
                inFlightRef.current = false;
                setStep(state.step);
            },
            onError: () => {
                inFlightRef.current = false;
            },
        });
    };

    const progressLabel = onboardingCopy.progress
        .replace("{current}", String(stepIndex + 1))
        .replace("{total}", String(totalSteps));
    const stepCopy = onboardingCopy.steps[step];

    const renderStep = () => {
        if (isLoading || !account) {
            return <FormSkeleton fields={1} />;
        }

        if (step === "profile") {
            return (
                <OnboardingProfileStep
                    confirmLabel={confirmLabel}
                    defaultDisplayName={account.displayName ?? ""}
                    isPending={isPending}
                    onSubmit={({ displayName }) =>
                        advance({
                            step,
                            outcome: "completed",
                            account: { displayName },
                        })
                    }
                />
            );
        }

        return (
            <OnboardingPreferencesStep
                confirmLabel={confirmLabel}
                defaultLocale={locale}
                isPending={isPending}
                onSkip={() => advance({ step, outcome: "skipped" })}
                onSubmit={(values) =>
                    advance(
                        {
                            step,
                            outcome: "completed",
                            account: { preferences: { locale: values.locale } },
                        },
                        values.locale
                    )
                }
            />
        );
    };

    return (
        <main className="flex min-h-dvh w-full items-center justify-center bg-background px-4 py-10 sm:px-8">
            <div className="flex w-full max-w-[440px] flex-col gap-6">
                <header className="flex flex-col gap-1">
                    <h1 className="text-balance font-semibold text-base tracking-tight">
                        {onboardingCopy.title}
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        {onboardingCopy.subtitle}
                    </p>
                </header>
                <Card className="gap-6 p-6 sm:p-8">
                    <div className="flex flex-col gap-2">
                        <span
                            className="font-medium text-muted-foreground text-xs tabular-nums"
                            id="onboarding-progress-label"
                        >
                            {progressLabel}
                        </span>
                        <Progress
                            aria-labelledby="onboarding-progress-label"
                            className="h-1.5"
                            value={
                                ((stepIndex + 1) / totalSteps) * FULL_PROGRESS
                            }
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <h2 className="text-balance font-semibold text-xl tracking-tight">
                            {stepCopy.title}
                        </h2>
                        <p className="text-pretty text-muted-foreground text-sm">
                            {stepCopy.description}
                        </p>
                    </div>
                    {isError ? (
                        <Container
                            className="p-0"
                            contentOnly
                            loadError={onboardingCopy.loadError}
                        />
                    ) : (
                        renderStep()
                    )}
                </Card>
            </div>
        </main>
    );
}
