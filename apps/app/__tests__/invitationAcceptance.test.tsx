import { UserRoleLevel } from "@repo/auth/types";
import { globalTranslations } from "@repo/internationalization/translations/global";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
    previewMock,
    acceptMock,
    pushMock,
    signOutMock,
    successAlertMock,
    errorAlertMock,
} = vi.hoisted(() => ({
    previewMock: vi.fn(),
    acceptMock: vi.fn(),
    pushMock: vi.fn(),
    signOutMock: vi.fn(),
    successAlertMock: vi.fn(),
    errorAlertMock: vi.fn(),
}));

vi.mock("@repo/auth/provider", () => ({
    default: () => ({
        signOut: {
            mutate: (...args: unknown[]) => signOutMock(...args),
            isPending: false,
        },
    }),
}));

vi.mock("next/navigation", () => ({
    useParams: () => ({ locale: "pt-br" }),
    useRouter: () => ({ push: pushMock, refresh: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/shared/lib/client", () => ({
    apiClient: {
        organization: {
            previewInvitation: (...args: unknown[]) => previewMock(...args),
            acceptInvitation: (...args: unknown[]) => acceptMock(...args),
        },
    },
}));

vi.mock("@repo/design-system/hooks/useAlert", () => ({
    default: () => ({
        successAlert: successAlertMock,
        errorAlert: errorAlertMock,
    }),
}));

const { InvitationAcceptance } = await import(
    "@/app/[locale]/(unauthenticated)/invite/components/InvitationAcceptance"
);
const { createPanelStore, PanelStoreContext } = await import(
    "@/shared/stores/panelStore"
);

const invitationCopy = globalTranslations["pt-br"].apps.app.pages.invitation;
const TOKEN = "tok_abc-123";
const INVITEE = "qa-teams-organizations@example.com";
const INVITER = "owner@example.com";

const STATUS_BAD_REQUEST = 400;
const STATUS_CONFLICT = 409;

function apiRefusal(code: string, status = STATUS_BAD_REQUEST) {
    return Object.assign(new Error(code), {
        isAxiosError: true,
        response: { status, data: { error: { code } } },
    });
}

let queryClient: QueryClient;

function renderAcceptance(
    token: string | null,
    signedInEmail: string | null = null
) {
    queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
    const panelStore = createPanelStore({
        profileKind: "common",
        panelRequestRole: UserRoleLevel.COMMON,
        impersonatedFirebaseUid: null,
    });
    panelStore.getState().setSdkAuthorized(Boolean(signedInEmail));
    render(
        <QueryClientProvider client={queryClient}>
            <PanelStoreContext.Provider value={panelStore}>
                <InvitationAcceptance
                    signedInEmail={signedInEmail}
                    token={token}
                />
            </PanelStoreContext.Provider>
        </QueryClientProvider>
    );
}

beforeEach(() => {
    vi.clearAllMocks();
    previewMock.mockResolvedValue({
        email: INVITEE,
        inviterEmail: INVITER,
        expiresAt: "2099-01-01T00:00:00.000Z",
    });
    acceptMock.mockResolvedValue({ organizationId: "org-1" });
});

afterEach(cleanup);

describe("InvitationAcceptance", () => {
    it("shows the invalid card without a token and asks nothing of the API", () => {
        renderAcceptance(null);

        expect(screen.getByText(invitationCopy.invalidTitle)).toBeTruthy();
        expect(previewMock).not.toHaveBeenCalled();
        expect(screen.queryByText(invitationCopy.accept)).toBeNull();
    });

    it("shows the expired card for an expired token", async () => {
        previewMock.mockRejectedValue(
            apiRefusal("ORGANIZATION_INVITATION_EXPIRED")
        );

        renderAcceptance(TOKEN);

        expect(
            await screen.findByText(invitationCopy.expiredTitle)
        ).toBeTruthy();
        expect(screen.queryByText(invitationCopy.accept)).toBeNull();
    });

    it("shows the invalid card for a revoked or unknown token", async () => {
        previewMock.mockRejectedValue(
            apiRefusal("ORGANIZATION_INVITATION_INVALID")
        );

        renderAcceptance(TOKEN);

        expect(
            await screen.findByText(invitationCopy.invalidTitle)
        ).toBeTruthy();
        expect(screen.getByText(invitationCopy.invalidBody)).toBeTruthy();
    });

    it("signed out, names who invited and keeps the token on both ways in", async () => {
        renderAcceptance(TOKEN);

        expect(
            await screen.findByText(
                invitationCopy.invitedBy
                    .replace("{inviter}", INVITER)
                    .replace("{email}", INVITEE)
            )
        ).toBeTruthy();
        const back = encodeURIComponent(`/pt-br/invite?token=${TOKEN}`);
        expect(
            screen
                .getByRole("link", { name: invitationCopy.signIn })
                .getAttribute("href")
        ).toBe(`/pt-br/sign-in?redirect=${back}`);
        expect(
            screen
                .getByRole("link", { name: invitationCopy.signUp })
                .getAttribute("href")
        ).toBe(`/pt-br/sign-up?redirect=${back}`);
        expect(previewMock).toHaveBeenCalledWith(TOKEN);
    });

    it("signed in with another address, offers to switch accounts instead of accepting", async () => {
        renderAcceptance(TOKEN, "someone-else@example.com");

        expect(
            await screen.findByText(
                invitationCopy.emailMismatch.replace("{email}", INVITEE)
            )
        ).toBeTruthy();
        expect(screen.queryByText(invitationCopy.accept)).toBeNull();

        fireEvent.click(
            screen.getByRole("button", { name: invitationCopy.switchAccount })
        );
        expect(signOutMock).toHaveBeenCalledTimes(1);
    });

    it("signed in with the invited address, warns about the previous organization and accepts once", async () => {
        renderAcceptance(TOKEN, "QA-Teams-Organizations@Example.com");

        expect(
            await screen.findByText(invitationCopy.previousOrganizationNotice)
        ).toBeTruthy();
        const reset = vi.spyOn(queryClient, "resetQueries");
        const acceptButton = screen.getByRole("button", {
            name: invitationCopy.accept,
        });

        await act(() => {
            fireEvent.click(acceptButton);
            fireEvent.click(acceptButton);
        });

        await waitFor(() =>
            expect(pushMock).toHaveBeenCalledWith("/pt-br/organization")
        );
        expect(acceptMock).toHaveBeenCalledTimes(1);
        expect(acceptMock).toHaveBeenCalledWith(TOKEN);
        expect(reset).toHaveBeenCalled();
        expect(successAlertMock).toHaveBeenCalledWith(invitationCopy.accepted);
    });

    it("keeps the accepted invitation on screen instead of asking again for the spent token", async () => {
        previewMock
            .mockResolvedValueOnce({
                email: INVITEE,
                inviterEmail: INVITER,
                expiresAt: "2099-01-01T00:00:00.000Z",
            })
            .mockRejectedValue(apiRefusal("ORGANIZATION_INVITATION_INVALID"));
        renderAcceptance(TOKEN, INVITEE);
        const acceptButton = await screen.findByRole("button", {
            name: invitationCopy.accept,
        });

        await act(() => {
            fireEvent.click(acceptButton);
        });
        await waitFor(() =>
            expect(pushMock).toHaveBeenCalledWith("/pt-br/organization")
        );

        expect(previewMock).toHaveBeenCalledTimes(1);
        expect(screen.queryByText(invitationCopy.invalidTitle)).toBeNull();
        expect(
            screen.getByRole("button", { name: invitationCopy.accept })
        ).toBeTruthy();
    });

    it("lets the person try again after a refusal", async () => {
        acceptMock.mockRejectedValueOnce(
            apiRefusal(
                "ORGANIZATION_INVITATION_OWNER_HAS_MEMBERS",
                STATUS_CONFLICT
            )
        );
        renderAcceptance(TOKEN, INVITEE);
        const acceptButton = await screen.findByRole("button", {
            name: invitationCopy.accept,
        });

        await act(() => {
            fireEvent.click(acceptButton);
        });
        await waitFor(() => expect(errorAlertMock).toHaveBeenCalledTimes(1));
        await waitFor(() =>
            expect(
                (
                    screen.getByRole("button", {
                        name: invitationCopy.accept,
                    }) as HTMLButtonElement
                ).disabled
            ).toBe(false)
        );
        await act(() => {
            fireEvent.click(
                screen.getByRole("button", { name: invitationCopy.accept })
            );
        });

        await waitFor(() => expect(acceptMock).toHaveBeenCalledTimes(2));
    });
});
