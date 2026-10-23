import { globalTranslations } from "@repo/internationalization/translations/global";
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    panelMock,
    organizationMock,
    membersMock,
    invitationsMock,
    inviteMutateMock,
    revokeMutateMock,
    removeMutateMock,
    leaveMutateMock,
} = vi.hoisted(() => ({
    panelMock: vi.fn(),
    organizationMock: vi.fn(),
    membersMock: vi.fn(),
    invitationsMock: vi.fn(),
    inviteMutateMock: vi.fn(),
    revokeMutateMock: vi.fn(),
    removeMutateMock: vi.fn(),
    leaveMutateMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
    useParams: () => ({ locale: "pt-br" }),
}));
vi.mock("@/shared/providers/AuthRequestPanelContext", () => ({
    useAuthRequestPanel: () => panelMock(),
}));
vi.mock("@/shared/lib/formatDisplayDateTime", () => ({
    useFormatDisplayDateTime: () => (value: string) => `at ${value}`,
}));
vi.mock(
    "@/app/[locale]/(authenticated)/(common)/(pages)/organization/(hooks)/useOrganization",
    () => ({
        useOrganization: () => organizationMock(),
    })
);
vi.mock(
    "@/app/[locale]/(authenticated)/(common)/(pages)/organization/(hooks)/useListOrganizationMembers",
    () => ({
        useListOrganizationMembers: () => membersMock(),
    })
);
vi.mock(
    "@/app/[locale]/(authenticated)/(common)/(pages)/organization/(hooks)/useListOrganizationInvitations",
    () => ({
        useListOrganizationInvitations: (isOwner: boolean) =>
            invitationsMock(isOwner),
    })
);
vi.mock(
    "@/app/[locale]/(authenticated)/(common)/(pages)/organization/(hooks)/useOrganizationActions",
    () => ({
        useOrganizationActions: () => ({
            inviteMutation: { mutate: inviteMutateMock, isPending: false },
            revokeInvitationMutation: { mutate: revokeMutateMock },
            removeMemberMutation: { mutate: removeMutateMock },
            leaveMutation: { mutate: leaveMutateMock, isPending: false },
        }),
    })
);

/**
 * Stand-ins for the antd-backed primitives: `Table` runs the column renderers per row and
 * shows `emptyText` when there is none, and `ActionsMenu` exposes each action as a button,
 * only when its handler was provided, as the shared component does.
 */
vi.mock("@repo/design-system/components/ui", () => ({
    ActionsMenu: ({
        onDelete,
        deleteLabels,
        items,
    }: {
        onDelete?: () => void;
        deleteLabels?: { action: string };
        items?: { key: string; label: string; onClick: () => void }[];
    }) => (
        <div>
            {items?.map((item) => (
                <button key={item.key} onClick={item.onClick} type="button">
                    {item.label}
                </button>
            ))}
            {onDelete ? (
                <button onClick={onDelete} type="button">
                    {deleteLabels?.action}
                </button>
            ) : null}
        </div>
    ),
    Table: <TRow,>({
        columns,
        dataSource,
        locale,
    }: {
        columns: {
            title: string;
            dataIndex: string;
            render?: (value: unknown, row: TRow) => ReactNode;
        }[];
        dataSource?: TRow[];
        locale?: { emptyText?: ReactNode };
    }) => (
        <div data-testid="table">
            <div data-testid="table-header">
                {columns.map((column) => (
                    <span key={column.dataIndex}>{column.title}</span>
                ))}
            </div>
            {dataSource?.length
                ? dataSource.map((row, rowIndex) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: stable fixture order
                      <div data-testid="table-row" key={rowIndex}>
                          {columns.map((column) => (
                              <div key={column.dataIndex}>
                                  {column.render?.(
                                      (row as Record<string, unknown>)[
                                          column.dataIndex
                                      ],
                                      row
                                  )}
                              </div>
                          ))}
                      </div>
                  ))
                : locale?.emptyText}
        </div>
    ),
}));

const { OrganizationClient } = await import(
    "@/app/[locale]/(authenticated)/(common)/(pages)/organization/OrganizationClient"
);

const organizationCopy =
    globalTranslations["pt-br"].apps.app.pages.common.organization;
const readOnlyCopy =
    globalTranslations["pt-br"].apps.app.pages.impersonation.readOnly;

const OWNER = {
    userId: "owner-profile",
    role: "owner" as const,
    email: "owner@example.com",
    displayName: "Owner",
    joinedAt: "2026-10-01T00:00:00.000Z",
};
const MEMBER = {
    userId: "member-profile",
    role: "member" as const,
    email: "qa-teams-organizations@example.com",
    displayName: "QA Member",
    joinedAt: "2026-10-02T00:00:00.000Z",
};
const ARCHIVED = {
    userId: "archived-profile",
    role: "member" as const,
    email: null,
    displayName: null,
    joinedAt: "2026-10-03T00:00:00.000Z",
};
const PENDING = {
    id: "inv-1",
    email: "qa-teams-organizations+1@example.com",
    role: "member" as const,
    status: "pending" as const,
    expiresAt: "2099-01-01T00:00:00.000Z",
    lastSentAt: "2026-10-22T12:00:00.000Z",
    createdAt: "2026-10-22T12:00:00.000Z",
};
const EXPIRED = {
    ...PENDING,
    id: "inv-2",
    email: "qa-teams-organizations+2@example.com",
    status: "expired" as const,
    expiresAt: "2026-10-01T00:00:00.000Z",
};

function listResult<TRow>(data: TRow[], error: unknown = null) {
    return {
        data,
        isLoading: false,
        isFetching: false,
        error,
        refetch: vi.fn(),
    };
}

function given(options: {
    viewerRole: "owner" | "member";
    isImpersonating?: boolean;
    members?: (typeof OWNER | typeof MEMBER | typeof ARCHIVED)[];
}) {
    panelMock.mockReturnValue({
        isImpersonating: options.isImpersonating ?? false,
        impersonatedLabel: options.isImpersonating ? "Alice" : null,
        impersonatedFirebaseUid: null,
    });
    organizationMock.mockReturnValue({
        data: {
            id: "org-1",
            ownerUserId: OWNER.userId,
            viewerRole: options.viewerRole,
        },
        isLoading: false,
        error: null,
    });
    membersMock.mockReturnValue(listResult(options.members ?? [OWNER, MEMBER]));
}

function rowOf(text: string): HTMLElement {
    const row = screen
        .getAllByTestId("table-row")
        .find((candidate) => candidate.textContent?.includes(text));
    if (!row) {
        throw new Error(`no row with ${text}`);
    }
    return row;
}

beforeEach(() => {
    cleanup();
    for (const mock of [
        panelMock,
        organizationMock,
        membersMock,
        invitationsMock,
        inviteMutateMock,
        revokeMutateMock,
        removeMutateMock,
        leaveMutateMock,
    ]) {
        mock.mockReset();
    }
    invitationsMock.mockReturnValue(listResult([PENDING, EXPIRED]));
});

describe("team page for the owner", () => {
    it("shows the invite form, the invitations and a remove action on every row but the owner's", () => {
        given({ viewerRole: "owner" });

        render(<OrganizationClient />);

        expect(screen.getByText(organizationCopy.invite.title)).toBeTruthy();
        expect(
            screen.getByText(organizationCopy.invitations.title)
        ).toBeTruthy();
        expect(screen.queryByText(organizationCopy.leave.title)).toBeNull();
        expect(
            within(rowOf(OWNER.email)).queryByRole("button", {
                name: organizationCopy.members.remove,
            })
        ).toBeNull();

        fireEvent.click(
            within(rowOf(MEMBER.email)).getByRole("button", {
                name: organizationCopy.members.remove,
            })
        );
        expect(removeMutateMock).toHaveBeenCalledWith(MEMBER.userId);
        expect(within(rowOf(OWNER.email)).getByText("Dono")).toBeTruthy();
    });

    it("marks an expired invitation, resends and revokes by row", () => {
        given({ viewerRole: "owner" });

        render(<OrganizationClient />);

        expect(
            within(rowOf(EXPIRED.email)).getByText(
                organizationCopy.invitations.expired
            )
        ).toBeTruthy();
        expect(
            within(rowOf(PENDING.email)).queryByText(
                organizationCopy.invitations.expired
            )
        ).toBeNull();

        fireEvent.click(
            within(rowOf(PENDING.email)).getByRole("button", {
                name: organizationCopy.invitations.resend,
            })
        );
        expect(inviteMutateMock).toHaveBeenCalledWith({
            email: PENDING.email,
            isResend: true,
        });

        fireEvent.click(
            within(rowOf(EXPIRED.email)).getByRole("button", {
                name: organizationCopy.invitations.revoke,
            })
        );
        expect(revokeMutateMock).toHaveBeenCalledWith(EXPIRED.id);
    });

    it("refuses an empty or malformed address before calling the API, then invites once", async () => {
        given({ viewerRole: "owner" });
        render(<OrganizationClient />);
        const submit = screen.getByRole("button", {
            name: organizationCopy.invite.submit,
        });

        await act(() => {
            fireEvent.click(submit);
        });
        expect(
            await screen.findByText(organizationCopy.invite.validation.required)
        ).toBeTruthy();

        fireEvent.change(
            screen.getByPlaceholderText(
                organizationCopy.invite.emailPlaceholder
            ),
            { target: { value: "not-an-address" } }
        );
        await act(() => {
            fireEvent.click(submit);
        });
        expect(
            await screen.findByText(organizationCopy.invite.validation.invalid)
        ).toBeTruthy();
        expect(inviteMutateMock).not.toHaveBeenCalled();

        fireEvent.change(
            screen.getByPlaceholderText(
                organizationCopy.invite.emailPlaceholder
            ),
            { target: { value: "  qa-teams-organizations+1@example.com " } }
        );
        await act(() => {
            fireEvent.click(submit);
        });
        await waitFor(() => expect(inviteMutateMock).toHaveBeenCalledTimes(1));
        expect(inviteMutateMock.mock.calls[0]?.[0]).toEqual({
            email: "qa-teams-organizations+1@example.com",
        });
    });

    it("lists an archived account without a name or address instead of failing", () => {
        given({ viewerRole: "owner", members: [OWNER, ARCHIVED] });

        render(<OrganizationClient />);

        const archivedRow = rowOf(organizationCopy.members.unnamed);
        expect(
            within(archivedRow).getByText(organizationCopy.members.noEmail)
        ).toBeTruthy();
    });
});

describe("team page for a member", () => {
    it("shows members without actions and offers to leave, behind a confirmation", async () => {
        given({ viewerRole: "member" });

        render(<OrganizationClient />);

        expect(screen.queryByText(organizationCopy.invite.title)).toBeNull();
        expect(
            screen.queryByText(organizationCopy.invitations.title)
        ).toBeNull();
        expect(
            screen.queryByText(organizationCopy.members.columns.actions)
        ).toBeNull();
        expect(
            screen.queryByRole("button", {
                name: organizationCopy.members.remove,
            })
        ).toBeNull();
        expect(invitationsMock).not.toHaveBeenCalled();

        fireEvent.click(
            screen.getByRole("button", { name: organizationCopy.leave.action })
        );
        expect(leaveMutateMock).not.toHaveBeenCalled();
        fireEvent.click(
            await screen.findByRole("button", {
                name: organizationCopy.leave.confirm,
            })
        );
        expect(leaveMutateMock).toHaveBeenCalledTimes(1);
    });

    it("shows the translated load error in the members table", () => {
        given({ viewerRole: "member" });
        membersMock.mockReturnValue(
            listResult([], {
                isAxiosError: true,
                response: {
                    status: 404,
                    data: { error: { code: "ORGANIZATION_MEMBERS_DISABLED" } },
                },
            })
        );

        render(<OrganizationClient />);

        const apiErrors = globalTranslations["pt-br"].packages.utils.apiErrors;
        expect(
            screen.getByText(apiErrors.ORGANIZATION_MEMBERS_DISABLED)
        ).toBeTruthy();
        expect(screen.queryByTestId("table-row")).toBeNull();
    });
});

describe("team page while an admin impersonates", () => {
    it("keeps everything visible to the owner's impersonator but every action off", () => {
        given({ viewerRole: "owner", isImpersonating: true });

        render(<OrganizationClient />);

        expect(screen.getByText(readOnlyCopy.title)).toBeTruthy();
        expect(screen.getByText(MEMBER.email)).toBeTruthy();
        expect(screen.getByText(PENDING.email)).toBeTruthy();
        expect(
            (
                screen.getByRole("button", {
                    name: organizationCopy.invite.submit,
                }) as HTMLButtonElement
            ).disabled
        ).toBe(true);
        expect(
            screen.queryByRole("button", {
                name: organizationCopy.members.remove,
            })
        ).toBeNull();
        expect(
            screen.queryByRole("button", {
                name: organizationCopy.invitations.revoke,
            })
        ).toBeNull();
    });

    it("disables leaving for a member's impersonator", () => {
        given({ viewerRole: "member", isImpersonating: true });

        render(<OrganizationClient />);

        expect(
            (
                screen.getByRole("button", {
                    name: organizationCopy.leave.action,
                }) as HTMLButtonElement
            ).disabled
        ).toBe(true);
    });
});
