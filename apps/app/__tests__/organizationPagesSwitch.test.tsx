import { globalTranslations } from "@repo/internationalization/translations/global";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { notFoundMock, sessionUserMock, getServerApiClientMock } = vi.hoisted(
    () => ({
        notFoundMock: vi.fn(() => {
            throw new Error("NEXT_NOT_FOUND");
        }),
        sessionUserMock: vi.fn(),
        getServerApiClientMock: vi.fn(),
    })
);

vi.mock("next/navigation", () => ({
    notFound: () => notFoundMock(),
    useParams: () => ({ locale: "pt-br" }),
    useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/lib/server/authSession", () => ({
    getAppSessionUser: () => sessionUserMock(),
}));

vi.mock("@/lib/server/apiServerClient", () => ({
    getServerApiClient: () => getServerApiClientMock(),
}));

vi.mock("@/lib/server/panelSnapshot", () => ({
    isImpersonating: () => Promise.resolve(false),
}));

vi.mock("@repo/seo/metadata", () => ({
    createMetadata: (value: unknown) => value,
}));

vi.mock(
    "@/app/[locale]/(authenticated)/(common)/(pages)/organization/OrganizationClient",
    () => ({ OrganizationClient: () => null })
);

vi.mock(
    "@/app/[locale]/(unauthenticated)/invite/components/InvitationAcceptance",
    () => ({ InvitationAcceptance: () => null })
);

const VARIABLE = "NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED";

async function loadPages() {
    vi.resetModules();
    const { default: InvitePage, generateMetadata: inviteMetadata } =
        await import("@/app/[locale]/(unauthenticated)/invite/page");
    const { default: OrganizationPage } = await import(
        "@/app/[locale]/(authenticated)/(common)/(pages)/organization/page"
    );
    return { InvitePage, inviteMetadata, OrganizationPage };
}

const TEAM_WORDS = /equipe|equipo|team|convite|invitation|invitación|organiza/i;

const invitePageProps = (token?: string) => ({
    params: Promise.resolve({ locale: "pt-br" }),
    searchParams: Promise.resolve(token === undefined ? {} : { token }),
});

beforeEach(() => {
    vi.clearAllMocks();
    sessionUserMock.mockResolvedValue(null);
    getServerApiClientMock.mockResolvedValue(null);
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("team and invitation pages with members switched off", () => {
    it.each(["", "false"])("answer 404 for %j", async (value) => {
        vi.stubEnv(VARIABLE, value);
        const { InvitePage, OrganizationPage } = await loadPages();

        await expect(InvitePage(invitePageProps("abc"))).rejects.toThrow(
            "NEXT_NOT_FOUND"
        );
        await expect(OrganizationPage()).rejects.toThrow("NEXT_NOT_FOUND");
        expect(sessionUserMock).not.toHaveBeenCalled();
    });

    /** The 404 inherits the route's metadata, so the tab must not name the team either. */
    it.each(
        (["", "false"] as const).flatMap((value) =>
            (["pt-br", "en", "es"] as const).map(
                (locale) => [value, locale] as const
            )
        )
    )(
        "give the invitation 404 the not-found title for %j in %s",
        async (value, locale) => {
            vi.stubEnv(VARIABLE, value);
            const { inviteMetadata } = await loadPages();
            const notFoundCopy =
                globalTranslations[locale].apps.app.pages.common.notFound;

            const metadata = await inviteMetadata({
                params: Promise.resolve({ locale }),
            });

            expect(metadata).toEqual({
                title: notFoundCopy.title,
                description: notFoundCopy.description,
            });
            expect(JSON.stringify(metadata)).not.toMatch(TEAM_WORDS);
        }
    );
});

describe("invitation page with members switched on", () => {
    beforeEach(() => {
        vi.stubEnv(VARIABLE, "true");
    });

    it("hands the token and the signed-in address to the client", async () => {
        sessionUserMock.mockResolvedValue({
            uid: "uid-1",
            email: "qa-teams-organizations@example.com",
        });
        const { InvitePage } = await loadPages();

        const element = (await InvitePage(invitePageProps("abc"))) as {
            props: { token: string | null; signedInEmail: string | null };
        };

        expect(element.props).toEqual({
            token: "abc",
            signedInEmail: "qa-teams-organizations@example.com",
        });
    });

    it("titles the page with the invitation copy", async () => {
        const { inviteMetadata } = await loadPages();

        const metadata = await inviteMetadata({
            params: Promise.resolve({ locale: "pt-br" }),
        });

        expect(metadata).toEqual(
            globalTranslations["pt-br"].apps.app.pages.invitation.meta
        );
    });

    it("treats an empty token as no token", async () => {
        const { InvitePage } = await loadPages();

        const element = (await InvitePage(invitePageProps(""))) as {
            props: { token: string | null; signedInEmail: string | null };
        };

        expect(element.props).toEqual({ token: null, signedInEmail: null });
    });
});
