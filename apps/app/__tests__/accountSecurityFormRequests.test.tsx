import { UserRoleLevel } from "@repo/auth/types";
import type { AccountDTO } from "@repo/sdk/src/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
})) as unknown as typeof window.matchMedia;

const { listSessionsMock } = vi.hoisted(() => ({
    listSessionsMock: vi.fn(),
}));

vi.mock("@/shared/lib/client", () => ({
    apiClient: {
        account: {
            listSessions: (...args: unknown[]) => listSessionsMock(...args),
        },
    },
}));

vi.mock("@/shared/providers/AuthRequestPanelContext", () => ({
    useAuthRequestPanel: () => ({ isImpersonating: false }),
}));

vi.mock("@repo/auth/provider", () => ({
    default: () => ({ signOut: { mutate: vi.fn() } }),
}));

vi.mock("@repo/design-system/hooks/useAlert", () => ({
    default: () => ({ errorAlert: vi.fn(), successAlert: vi.fn() }),
}));

vi.mock(
    "@/app/[locale]/(authenticated)/(common)/(pages)/account/(hooks)/useSignInMethodMutations",
    () => ({
        useSignInMethodMutations: () => ({
            setPasswordMutation: { mutate: vi.fn(), isPending: false },
            linkGoogleMutation: { mutate: vi.fn(), isPending: false },
            unlinkMutation: {
                mutate: vi.fn(),
                isPending: false,
                variables: undefined,
            },
        }),
    })
);

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
    useParams: () => ({ locale: "pt-br" }),
}));

const { AccountSecurityForm } = await import(
    "@/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountSecurityForm"
);
const { createPanelStore, PanelStoreContext } = await import(
    "@/shared/stores/panelStore"
);

const PASSWORD_ACCOUNT = {
    providerData: [
        {
            providerId: "password",
            uid: "password-uid",
            displayName: null,
            email: "owner@example.com",
            phoneNumber: null,
        },
    ],
} as unknown as AccountDTO;

const SETTLE_DELAY_MS = 20;

function renderWithClient(ui: ReactNode) {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
    const store = createPanelStore({
        profileKind: "common",
        panelRequestRole: UserRoleLevel.COMMON,
        impersonatedFirebaseUid: null,
    });
    store.getState().setSdkAuthorized(true);
    return render(
        <PanelStoreContext.Provider value={store}>
            <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
        </PanelStoreContext.Provider>
    );
}

beforeEach(() => {
    vi.clearAllMocks();
    listSessionsMock.mockResolvedValue([]);
});

afterEach(cleanup);

describe("AccountSecurityForm — requisições ao abrir a seção", () => {
    it("não pede a lista de sessões no modo só senha", async () => {
        renderWithClient(
            <AccountSecurityForm account={PASSWORD_ACCOUNT} passwordOnly />
        );

        await new Promise((resolve) => setTimeout(resolve, SETTLE_DELAY_MS));
        expect(listSessionsMock).not.toHaveBeenCalled();
    });

    it("pede a lista de sessões na conta comum", async () => {
        renderWithClient(<AccountSecurityForm account={PASSWORD_ACCOUNT} />);

        await waitFor(() => expect(listSessionsMock).toHaveBeenCalledTimes(1));
    });
});
