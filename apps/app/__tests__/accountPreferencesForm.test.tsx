import type { AccountDTO } from "@repo/sdk/src/types";
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { panelMock, updatePreferencesMutateMock, setThemeMock } = vi.hoisted(
    () => ({
        panelMock: vi.fn(),
        updatePreferencesMutateMock: vi.fn(),
        setThemeMock: vi.fn(),
    })
);

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
    useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
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
});
