import type { AccountDTO } from "@repo/sdk/src/types";
import { removeCookie } from "@repo/shared/utils/helpers/cookies";
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { panelMock, updatePreferencesMutateMock, setThemeMock, pushMock } =
    vi.hoisted(() => ({
        panelMock: vi.fn(),
        updatePreferencesMutateMock: vi.fn(),
        setThemeMock: vi.fn(),
        pushMock: vi.fn(),
    }));

vi.mock("@/shared/providers/AuthRequestPanelContext", () => ({
    useAuthRequestPanel: () => panelMock(),
}));

vi.mock(
    "@/app/[locale]/(authenticated)/(common)/(pages)/account/(hooks)/useAccountMutations",
    () => ({
        useAccountMutations: () => ({
            updatePreferencesMutation: {
                mutate: updatePreferencesMutateMock,
                isPending: false,
            },
        }),
    })
);

vi.mock("next-themes", () => ({
    useTheme: () => ({ setTheme: setThemeMock }),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: pushMock, refresh: vi.fn(), back: vi.fn() }),
    useParams: () => ({ locale: "pt-br" }),
}));

const { AccountPreferencesForm } = await import(
    "@/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountPreferencesForm"
);
const { globalTranslations } = await import(
    "@repo/internationalization/translations/global"
);

const accountPreferences =
    globalTranslations["pt-br"].apps.app.pages.common.account.preferences;

function accountWith(locale: "pt-br" | "en" | "es", theme: "light" | "dark") {
    return {
        id: "account-1",
        preferences: { theme, locale },
    } as unknown as AccountDTO;
}

describe("AccountPreferencesForm", () => {
    beforeEach(() => {
        // O primitivo de select observa o tamanho do gatilho; o jsdom não traz a API.
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
        panelMock.mockReturnValue({ isImpersonating: false });
    });

    afterEach(cleanup);

    it("mantém o idioma da conta quando o dado chega depois do primeiro render", async () => {
        const { rerender } = render(
            <AccountPreferencesForm account={undefined} />
        );

        rerender(
            <AccountPreferencesForm account={accountWith("es", "light")} />
        );

        await waitFor(() => {
            expect(
                screen.getByRole("combobox", {
                    name: accountPreferences.language,
                }).textContent
            ).toContain("Español");
        });

        fireEvent.click(
            screen.getByRole("button", { name: accountPreferences.save })
        );

        await waitFor(() => {
            expect(updatePreferencesMutateMock).toHaveBeenCalledTimes(1);
        });
        expect(updatePreferencesMutateMock.mock.calls[0]?.[0]).toEqual({
            preferences: { theme: "light", locale: "es" },
        });
    });

    it.each([
        [undefined, "/en/account?tab=preferences"],
        ["/admin/account", "/en/admin/account?tab=preferences"],
    ])(
        "com accountPath %j, salvar navega para %s no idioma escolhido",
        async (accountPath, expectedUrl) => {
            // Saving writes the x-locale cookie, which the dictionary of the next render reads.
            removeCookie("x-locale");
            updatePreferencesMutateMock.mockImplementation(
                (_body, options: { onSuccess: () => void }) =>
                    options.onSuccess()
            );

            render(
                <AccountPreferencesForm
                    account={accountWith("en", "dark")}
                    accountPath={accountPath}
                />
            );

            await waitFor(() => {
                expect(
                    screen.getByRole("combobox", {
                        name: accountPreferences.language,
                    }).textContent
                ).toContain("English");
            });

            fireEvent.click(
                screen.getByRole("button", { name: accountPreferences.save })
            );

            await waitFor(() => {
                expect(pushMock).toHaveBeenCalledWith(expectedUrl);
            });
        }
    );
});
