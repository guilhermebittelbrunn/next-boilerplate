import { UserType } from "@repo/sdk/src/types";
import { setCookie } from "@repo/shared/utils/helpers/cookies";
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, findUserMock, updateMutateMock } = vi.hoisted(() => ({
    authMock: vi.fn(),
    findUserMock: vi.fn(),
    updateMutateMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    useParams: () => ({ locale: "pt-br", id: "profile-1" }),
    useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

vi.mock("@repo/auth/provider", () => ({
    default: () => authMock(),
}));

vi.mock(
    "@/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(hooks)/useFindUserById",
    () => ({
        useFindUserById: () => findUserMock(),
    })
);

vi.mock(
    "@/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(hooks)/useUserCrud",
    () => ({
        useUserCrud: () => ({
            updateUserMutation: { mutate: updateMutateMock, isPending: false },
        }),
    })
);

const { default: EditUserPage } = await import(
    "@/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/edit/[id]/page"
);
const { globalTranslations } = await import(
    "@repo/internationalization/translations/global"
);

const adminUsersForm =
    globalTranslations["pt-br"].apps.app.pages.admin.users.form;

const ADMIN_UID = "uid-admin";

function editedUser(uid: string) {
    return {
        id: "profile-1",
        uid,
        reference_id: uid,
        email: "qa-admin-self-lockout@example.com",
        displayName: "Ana",
        type: UserType.ADMIN,
    };
}

function loadUser(uid: string) {
    findUserMock.mockReturnValue({
        data: editedUser(uid),
        isLoading: false,
        isError: false,
    });
}

function typeSelect() {
    return screen.getByRole("combobox");
}

beforeEach(() => {
    vi.clearAllMocks();
    const ONE_HOUR_IN_SECONDS = 3600;
    setCookie("x-locale", "pt-br", ONE_HOUR_IN_SECONDS);
    authMock.mockReturnValue({ user: { uid: ADMIN_UID } });
});

afterEach(cleanup);

describe("EditUserPage on the signed-in admin's own account", () => {
    it("locks the type select and shows the hint", () => {
        loadUser(ADMIN_UID);
        render(<EditUserPage />);

        expect(typeSelect()).toHaveProperty("disabled", true);
        expect(screen.getByText(adminUsersForm.typeSelfLocked)).toBeTruthy();
    });

    it("still submits the admin type when only the name changes", async () => {
        loadUser(ADMIN_UID);
        render(<EditUserPage />);

        fireEvent.change(
            screen.getByPlaceholderText(adminUsersForm.displayName),
            { target: { value: "Ana Admin" } }
        );
        fireEvent.click(
            screen.getByRole("button", { name: adminUsersForm.save })
        );

        await waitFor(() => expect(updateMutateMock).toHaveBeenCalledTimes(1));
        expect(updateMutateMock.mock.calls[0]?.[0]).toMatchObject({
            id: "profile-1",
            displayName: "Ana Admin",
            type: UserType.ADMIN,
        });
    });
});

describe("EditUserPage on another account", () => {
    it("leaves the type select enabled with no hint for another admin", () => {
        loadUser("uid-other-admin");
        render(<EditUserPage />);

        expect(typeSelect()).toHaveProperty("disabled", false);
        expect(screen.queryByText(adminUsersForm.typeSelfLocked)).toBeNull();
    });

    it("does not lock the select while the signed-in user is unknown", () => {
        authMock.mockReturnValue({ user: null });
        loadUser(ADMIN_UID);
        render(<EditUserPage />);

        expect(typeSelect()).toHaveProperty("disabled", false);
        expect(screen.queryByText(adminUsersForm.typeSelfLocked)).toBeNull();
    });
});
