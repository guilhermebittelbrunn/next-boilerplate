import { UserRoleLevel } from "@repo/auth/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    getMock,
    listMembersMock,
    listInvitationsMock,
    inviteMock,
    revokeInvitationMock,
    removeMemberMock,
    leaveMock,
    successAlertMock,
    warningAlertMock,
    errorAlertMock,
} = vi.hoisted(() => ({
    getMock: vi.fn(),
    listMembersMock: vi.fn(),
    listInvitationsMock: vi.fn(),
    inviteMock: vi.fn(),
    revokeInvitationMock: vi.fn(),
    removeMemberMock: vi.fn(),
    leaveMock: vi.fn(),
    successAlertMock: vi.fn(),
    warningAlertMock: vi.fn(),
    errorAlertMock: vi.fn(),
}));

vi.mock("@/shared/lib/client", () => ({
    apiClient: {
        organization: {
            get: (...args: unknown[]) => getMock(...args),
            listMembers: (...args: unknown[]) => listMembersMock(...args),
            listInvitations: (...args: unknown[]) =>
                listInvitationsMock(...args),
            invite: (...args: unknown[]) => inviteMock(...args),
            revokeInvitation: (...args: unknown[]) =>
                revokeInvitationMock(...args),
            removeMember: (...args: unknown[]) => removeMemberMock(...args),
            leave: (...args: unknown[]) => leaveMock(...args),
        },
    },
}));

vi.mock("@repo/design-system/hooks/useAlert", () => ({
    default: () => ({
        errorAlert: errorAlertMock,
        successAlert: successAlertMock,
        warningAlert: warningAlertMock,
    }),
}));

vi.mock("@repo/shared/utils/helpers/handleClientError", () => ({
    handleClientError: (error: { message: string }) =>
        `traduzido: ${error.message}`,
}));

vi.mock("@repo/shared/utils/helpers/formattedError", () => ({
    default: class {
        message: string;
        constructor(error: { code?: string }) {
            this.message = error.code ?? "unknown";
        }
    },
}));

const { useListOrganizationInvitations } = await import(
    "@/app/[locale]/(authenticated)/(common)/(pages)/organization/(hooks)/useListOrganizationInvitations"
);
const { useListOrganizationMembers } = await import(
    "@/app/[locale]/(authenticated)/(common)/(pages)/organization/(hooks)/useListOrganizationMembers"
);
const { useOrganizationActions } = await import(
    "@/app/[locale]/(authenticated)/(common)/(pages)/organization/(hooks)/useOrganizationActions"
);
const { queryKeys } = await import("@/shared/lib/queryKeys");
const { createPanelStore, PanelStoreContext } = await import(
    "@/shared/stores/panelStore"
);
const { globalTranslations } = await import(
    "@repo/internationalization/translations/global"
);

const organizationCopy =
    globalTranslations["pt-br"].apps.app.pages.common.organization;
const INVITEE = "qa-teams-organizations@example.com";

let queryClient: QueryClient;
let panelStore: ReturnType<typeof createPanelStore>;

function wrapper({ children }: { children: ReactNode }) {
    return (
        <QueryClientProvider client={queryClient}>
            <PanelStoreContext.Provider value={panelStore}>
                {children}
            </PanelStoreContext.Provider>
        </QueryClientProvider>
    );
}

beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
    panelStore = createPanelStore({
        profileKind: "common",
        panelRequestRole: UserRoleLevel.COMMON,
        impersonatedFirebaseUid: null,
    });
    panelStore.getState().setSdkAuthorized(true);
    listMembersMock.mockResolvedValue([]);
    listInvitationsMock.mockResolvedValue([]);
    inviteMock.mockResolvedValue({
        invitation: { id: "inv-1" },
        delivery: "sent",
    });
    revokeInvitationMock.mockResolvedValue(undefined);
    removeMemberMock.mockResolvedValue(undefined);
    leaveMock.mockResolvedValue(undefined);
});

describe("organization queries", () => {
    it("keeps the members under the organization key", async () => {
        const { result } = renderHook(() => useListOrganizationMembers(), {
            wrapper,
        });

        await waitFor(() => expect(result.current.data).toEqual([]));
        expect(
            queryClient.getQueryData(queryKeys.organization.members())
        ).toEqual([]);
    });

    /** A member asking for invitations would get a 403 the cache would keep. */
    it("asks for invitations only on behalf of the owner", async () => {
        renderHook(() => useListOrganizationInvitations(false), { wrapper });

        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(listInvitationsMock).not.toHaveBeenCalled();
    });
});

describe("useOrganizationActions", () => {
    it("invites in the current language and refreshes the pending list", async () => {
        const invalidate = vi.spyOn(queryClient, "invalidateQueries");
        const { result } = renderHook(() => useOrganizationActions(), {
            wrapper,
        });

        result.current.inviteMutation.mutate({ email: INVITEE });

        await waitFor(() =>
            expect(successAlertMock).toHaveBeenCalledWith(
                organizationCopy.invite.sent
            )
        );
        expect(inviteMock).toHaveBeenCalledWith({
            email: INVITEE,
            locale: "pt-br",
        });
        expect(invalidate).toHaveBeenCalledWith({
            queryKey: queryKeys.organization.invitations(),
        });
    });

    it("warns, instead of confirming, when the email did not go out", async () => {
        inviteMock.mockResolvedValue({
            invitation: { id: "inv-1" },
            delivery: "failed",
        });
        const { result } = renderHook(() => useOrganizationActions(), {
            wrapper,
        });

        result.current.inviteMutation.mutate({ email: INVITEE });

        await waitFor(() =>
            expect(warningAlertMock).toHaveBeenCalledWith(
                organizationCopy.invite.deliveryFailed
            )
        );
        expect(successAlertMock).not.toHaveBeenCalled();
    });

    it("says the invitation was sent again on a resend", async () => {
        const { result } = renderHook(() => useOrganizationActions(), {
            wrapper,
        });

        result.current.inviteMutation.mutate({
            email: INVITEE,
            isResend: true,
        });

        await waitFor(() =>
            expect(successAlertMock).toHaveBeenCalledWith(
                organizationCopy.invitations.resent
            )
        );
    });

    it("shows the translated refusal", async () => {
        inviteMock.mockRejectedValue({
            code: "ORGANIZATION_INVITATION_RECENTLY_SENT",
        });
        const { result } = renderHook(() => useOrganizationActions(), {
            wrapper,
        });

        result.current.inviteMutation.mutate({ email: INVITEE });

        await waitFor(() =>
            expect(errorAlertMock).toHaveBeenCalledWith(
                "traduzido: ORGANIZATION_INVITATION_RECENTLY_SENT"
            )
        );
    });

    it("refreshes the members after a removal", async () => {
        const invalidate = vi.spyOn(queryClient, "invalidateQueries");
        const { result } = renderHook(() => useOrganizationActions(), {
            wrapper,
        });

        result.current.removeMemberMutation.mutate("member-b");

        await waitFor(() =>
            expect(successAlertMock).toHaveBeenCalledWith(
                organizationCopy.members.removed
            )
        );
        expect(removeMemberMock).toHaveBeenCalledWith("member-b");
        expect(invalidate).toHaveBeenCalledWith({
            queryKey: queryKeys.organization.members(),
        });
    });

    it("refreshes the pending list after a revocation", async () => {
        const invalidate = vi.spyOn(queryClient, "invalidateQueries");
        const { result } = renderHook(() => useOrganizationActions(), {
            wrapper,
        });

        result.current.revokeInvitationMutation.mutate("inv-1");

        await waitFor(() =>
            expect(invalidate).toHaveBeenCalledWith({
                queryKey: queryKeys.organization.invitations(),
            })
        );
    });

    /** Every cached query belonged to the organization the person just left. */
    it("resets the whole cache after leaving", async () => {
        const reset = vi.spyOn(queryClient, "resetQueries");
        const invalidate = vi.spyOn(queryClient, "invalidateQueries");
        const { result } = renderHook(() => useOrganizationActions(), {
            wrapper,
        });

        result.current.leaveMutation.mutate();

        await waitFor(() =>
            expect(successAlertMock).toHaveBeenCalledWith(
                organizationCopy.leave.done
            )
        );
        expect(reset).toHaveBeenCalledWith();
        expect(invalidate).not.toHaveBeenCalled();
    });
});
