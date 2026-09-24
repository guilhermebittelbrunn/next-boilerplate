import { setCookie as writeCookie } from "@repo/shared/utils/helpers/cookies";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import { AxiosError, AxiosHeaders } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
    updateMock,
    advanceOnboardingMock,
    replaceMock,
    refreshMock,
    errorAlertMock,
    setCookieMock,
    accountMock,
} = vi.hoisted(() => ({
    updateMock: vi.fn(),
    advanceOnboardingMock: vi.fn(),
    replaceMock: vi.fn(),
    refreshMock: vi.fn(),
    errorAlertMock: vi.fn(),
    setCookieMock: vi.fn(),
    accountMock: vi.fn(),
}));

vi.mock("@/shared/lib/client", () => ({
    apiClient: {
        account: {
            update: (...args: unknown[]) => updateMock(...args),
            advanceOnboarding: (...args: unknown[]) =>
                advanceOnboardingMock(...args),
        },
    },
}));

vi.mock("@/shared/hooks/useMyAccount", () => ({
    useMyAccount: () => accountMock(),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({
        replace: replaceMock,
        refresh: refreshMock,
        push: vi.fn(),
        back: vi.fn(),
    }),
}));

vi.mock("@repo/design-system/hooks/useAlert", () => ({
    default: () => ({ successAlert: vi.fn(), errorAlert: errorAlertMock }),
}));

vi.mock("@repo/shared/utils", () => ({
    setCookie: (...args: unknown[]) => setCookieMock(...args),
}));

const { OnboardingClient } = await import(
    "@/app/[locale]/(authenticated)/onboarding/(components)/OnboardingClient"
);
const { globalTranslations } = await import(
    "@repo/internationalization/translations/global"
);

const onboardingCopy = globalTranslations["pt-br"].apps.app.pages.onboarding;
const DESTINATION = "/pt-br/entities/create";
const COOKIE_TTL_SECONDS = 3600;

function renderClient(initialStep: "profile" | "preferences") {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
    return render(
        <QueryClientProvider client={queryClient}>
            <OnboardingClient
                destination={DESTINATION}
                initialStep={initialStep}
            />
        </QueryClientProvider>
    );
}

function apiError(status: number, code: string): AxiosError {
    const headers = new AxiosHeaders();
    const config = { headers };
    return new AxiosError("Request failed", "ERR_BAD_REQUEST", config, {}, {
        status,
        statusText: "",
        headers: new AxiosHeaders(),
        config,
        data: { error: { code } },
    } as never);
}

function buttonNamed(name: string) {
    return screen.getByRole("button", { name });
}

describe("OnboardingClient", () => {
    beforeEach(() => {
        globalThis.ResizeObserver ??= class {
            observe() {
                return;
            }
            unobserve() {
                return;
            }
            disconnect() {
                return;
            }
        };
        vi.clearAllMocks();
        accountMock.mockReturnValue({
            data: {
                displayName: null,
                preferences: { theme: "system", locale: "pt-br" },
            },
            isLoading: false,
            isError: false,
        });
        updateMock.mockResolvedValue({});
    });

    afterEach(() => {
        cleanup();
        writeCookie("x-locale", "", -1);
    });

    it("shows the progress and no skip on the required step", () => {
        renderClient("profile");

        expect(
            screen.getByText(
                onboardingCopy.progress
                    .replace("{current}", "1")
                    .replace("{total}", "2")
            )
        ).toBeDefined();
        expect(
            screen.queryByRole("button", { name: onboardingCopy.actions.skip })
        ).toBeNull();
        expect(buttonNamed(onboardingCopy.actions.next)).toBeDefined();
    });

    it("refuses an empty name without calling the API", async () => {
        renderClient("profile");

        fireEvent.change(
            screen.getByLabelText(onboardingCopy.steps.profile.displayName, {
                exact: false,
            }),
            { target: { value: "   " } }
        );
        fireEvent.click(buttonNamed(onboardingCopy.actions.next));

        expect(
            await screen.findByText(
                onboardingCopy.steps.profile.validation.displayNameRequired
            )
        ).toBeDefined();
        expect(updateMock).not.toHaveBeenCalled();
        expect(advanceOnboardingMock).not.toHaveBeenCalled();
    });

    it("saves the name through the account, then advances to the next step", async () => {
        advanceOnboardingMock.mockResolvedValue({
            step: "preferences",
            completedAt: null,
        });
        renderClient("profile");

        fireEvent.change(
            screen.getByLabelText(onboardingCopy.steps.profile.displayName, {
                exact: false,
            }),
            { target: { value: "  Ana  " } }
        );
        fireEvent.click(buttonNamed(onboardingCopy.actions.next));

        await waitFor(() =>
            expect(buttonNamed(onboardingCopy.actions.skip)).toBeDefined()
        );
        expect(updateMock).toHaveBeenCalledWith({ displayName: "Ana" });
        expect(advanceOnboardingMock).toHaveBeenCalledWith({
            step: "profile",
            outcome: "completed",
        });
        expect(updateMock.mock.invocationCallOrder[0]).toBeLessThan(
            advanceOnboardingMock.mock.invocationCallOrder[0]
        );
        expect(replaceMock).not.toHaveBeenCalled();
    });

    it("skips the optional step without touching the account and goes to the destination", async () => {
        advanceOnboardingMock.mockResolvedValue({
            step: "preferences",
            completedAt: "2026-09-24T12:00:00.000Z",
        });
        renderClient("preferences");

        fireEvent.click(buttonNamed(onboardingCopy.actions.skip));
        fireEvent.click(buttonNamed(onboardingCopy.actions.skip));

        await waitFor(() =>
            expect(replaceMock).toHaveBeenCalledWith(DESTINATION)
        );
        expect(advanceOnboardingMock).toHaveBeenCalledTimes(1);
        expect(advanceOnboardingMock).toHaveBeenCalledWith({
            step: "preferences",
            outcome: "skipped",
        });
        expect(updateMock).not.toHaveBeenCalled();
        expect(setCookieMock).not.toHaveBeenCalled();
    });

    it("finishes with the language kept and lands on the destination as is", async () => {
        advanceOnboardingMock.mockResolvedValue({
            step: "preferences",
            completedAt: "2026-09-24T12:00:00.000Z",
        });
        renderClient("preferences");

        fireEvent.click(buttonNamed(onboardingCopy.actions.finish));

        await waitFor(() =>
            expect(replaceMock).toHaveBeenCalledWith(DESTINATION)
        );
        expect(updateMock).toHaveBeenCalledWith({
            preferences: { locale: "pt-br" },
        });
        expect(setCookieMock).not.toHaveBeenCalled();
    });

    it("preselects the language of the screen, not the account default", async () => {
        writeCookie("x-locale", "en", COOKIE_TTL_SECONDS);
        const englishCopy = globalTranslations.en.apps.app.pages.onboarding;
        advanceOnboardingMock.mockResolvedValue({
            step: "preferences",
            completedAt: "2026-09-24T12:00:00.000Z",
        });
        renderClient("preferences");

        fireEvent.click(buttonNamed(englishCopy.actions.finish));

        await waitFor(() =>
            expect(replaceMock).toHaveBeenCalledWith(DESTINATION)
        );
        expect(updateMock).toHaveBeenCalledWith({
            preferences: { locale: "en" },
        });
        expect(setCookieMock).not.toHaveBeenCalled();
    });

    it("carries a newly chosen language into the destination", async () => {
        advanceOnboardingMock.mockResolvedValue({
            step: "preferences",
            completedAt: "2026-09-24T12:00:00.000Z",
        });
        const { container } = renderClient("preferences");

        const languageSelect = container.querySelector("select");
        if (!languageSelect) {
            throw new Error("language select not rendered");
        }
        fireEvent.change(languageSelect, { target: { value: "en" } });
        fireEvent.click(buttonNamed(onboardingCopy.actions.finish));

        await waitFor(() =>
            expect(replaceMock).toHaveBeenCalledWith("/en/entities/create")
        );
        expect(updateMock).toHaveBeenCalledWith({
            preferences: { locale: "en" },
        });
        expect(setCookieMock).toHaveBeenCalledWith(
            "x-locale",
            "en",
            expect.any(Number)
        );
    });

    it("goes to the destination when the API says there is nothing left", async () => {
        advanceOnboardingMock.mockResolvedValue(null);
        renderClient("preferences");

        fireEvent.click(buttonNamed(onboardingCopy.actions.skip));

        await waitFor(() =>
            expect(replaceMock).toHaveBeenCalledWith(DESTINATION)
        );
    });

    it("shows the error and stays on the step when advancing fails", async () => {
        advanceOnboardingMock.mockRejectedValue(new Error("boom"));
        renderClient("preferences");

        fireEvent.click(buttonNamed(onboardingCopy.actions.skip));

        await waitFor(() => expect(errorAlertMock).toHaveBeenCalledTimes(1));
        expect(replaceMock).not.toHaveBeenCalled();
        expect(buttonNamed(onboardingCopy.actions.skip)).toBeDefined();
    });

    it("resyncs the step from the server when the API says it moved on elsewhere", async () => {
        advanceOnboardingMock.mockRejectedValue(
            apiError(HTTP_STATUS.CONFLICT, "ONBOARDING_STEP_OUT_OF_ORDER")
        );
        renderClient("preferences");

        fireEvent.click(buttonNamed(onboardingCopy.actions.skip));

        await waitFor(() => expect(refreshMock).toHaveBeenCalledTimes(1));
        expect(errorAlertMock).toHaveBeenCalledTimes(1);
        expect(replaceMock).not.toHaveBeenCalled();
    });

    it("goes back to the step the server rendered when a later step conflicts", async () => {
        advanceOnboardingMock
            .mockResolvedValueOnce({ step: "preferences", completedAt: null })
            .mockRejectedValueOnce(
                apiError(HTTP_STATUS.CONFLICT, "ONBOARDING_STEP_OUT_OF_ORDER")
            );
        renderClient("profile");

        fireEvent.change(
            screen.getByLabelText(onboardingCopy.steps.profile.displayName, {
                exact: false,
            }),
            { target: { value: "Ana" } }
        );
        fireEvent.click(buttonNamed(onboardingCopy.actions.next));
        await waitFor(() =>
            expect(buttonNamed(onboardingCopy.actions.skip)).toBeDefined()
        );

        fireEvent.click(buttonNamed(onboardingCopy.actions.skip));

        await waitFor(() => expect(refreshMock).toHaveBeenCalledTimes(1));
        expect(
            await screen.findByText(onboardingCopy.steps.profile.title)
        ).toBeDefined();
        expect(
            screen.queryByRole("button", { name: onboardingCopy.actions.skip })
        ).toBeNull();
    });

    it("does not refresh on an error that is not a conflict", async () => {
        advanceOnboardingMock.mockRejectedValue(
            apiError(
                HTTP_STATUS.INTERNAL_SERVER_ERROR,
                "ONBOARDING_UPDATE_FAILED"
            )
        );
        renderClient("preferences");

        fireEvent.click(buttonNamed(onboardingCopy.actions.skip));

        await waitFor(() => expect(errorAlertMock).toHaveBeenCalledTimes(1));
        expect(refreshMock).not.toHaveBeenCalled();
    });
});
