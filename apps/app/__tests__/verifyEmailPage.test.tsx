import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { confirmEmailChangeMock, confirmVerificationMock, mutationState } =
    vi.hoisted(() => ({
        confirmEmailChangeMock: vi.fn(),
        confirmVerificationMock: vi.fn(),
        mutationState: { isError: false, isSuccess: false },
    }));

vi.mock("@/shared/hooks/useEmailVerification", () => ({
    useEmailVerification: () => ({
        confirmEmailChangeMutation: {
            mutate: confirmEmailChangeMock,
            ...mutationState,
        },
        confirmVerificationMutation: {
            mutate: confirmVerificationMock,
            isError: false,
            isSuccess: false,
        },
    }),
}));

vi.mock("@repo/seo/metadata", () => ({
    createMetadata: (value: unknown) => value,
}));

vi.mock("next/navigation", () => ({
    useParams: () => ({ locale: "pt-br" }),
}));

const { default: VerifyEmail } = await import(
    "@/app/[locale]/(unauthenticated)/verify-email/page"
);
const { ConfirmEmailChangeResult } = await import(
    "@/app/[locale]/(unauthenticated)/verify-email/components/ConfirmEmailChangeResult"
);
const { VerifyEmailResult } = await import(
    "@/app/[locale]/(unauthenticated)/verify-email/components/VerifyEmailResult"
);
const { globalTranslations } = await import(
    "@repo/internationalization/translations/global"
);

const verificationCopy =
    globalTranslations["pt-br"].apps.app.pages.emailVerification;
const changeCopy = verificationCopy.changeEmail;

async function pageFor(searchParams: Record<string, string | string[]>) {
    return (await VerifyEmail({
        params: Promise.resolve({ locale: "pt-br" }),
        searchParams: Promise.resolve(searchParams),
    })) as { type: unknown; props: { oobCode: string | null } };
}

beforeEach(() => {
    vi.clearAllMocks();
    mutationState.isError = false;
    mutationState.isSuccess = false;
});

afterEach(cleanup);

describe("verify-email page", () => {
    it("routes the email change mode to its own result", async () => {
        const element = await pageFor({
            oobCode: "code-1",
            mode: "verifyAndChangeEmail",
        });

        expect(element.type).toBe(ConfirmEmailChangeResult);
        expect(element.props.oobCode).toBe("code-1");
    });

    it("keeps the verification result when no mode is given", async () => {
        const element = await pageFor({ oobCode: "code-1" });

        expect(element.type).toBe(VerifyEmailResult);
    });

    it("keeps the verification result for any other mode", async () => {
        const element = await pageFor({ oobCode: "code-1", mode: "other" });

        expect(element.type).toBe(VerifyEmailResult);
    });

    it("hands an empty code to the change result as missing", async () => {
        const element = await pageFor({
            oobCode: "",
            mode: "verifyAndChangeEmail",
        });

        expect(element.props.oobCode).toBeNull();
    });
});

describe("ConfirmEmailChangeResult", () => {
    it("spends the code once per mount", () => {
        const { rerender } = render(
            <ConfirmEmailChangeResult oobCode="code-1" />
        );
        rerender(<ConfirmEmailChangeResult oobCode="code-1" />);

        expect(confirmEmailChangeMock).toHaveBeenCalledTimes(1);
        expect(confirmEmailChangeMock).toHaveBeenCalledWith("code-1");
        expect(confirmVerificationMock).not.toHaveBeenCalled();
        expect(screen.getByText(changeCopy.confirming)).toBeTruthy();
    });

    it("shows the invalid link card without a code and spends nothing", () => {
        render(<ConfirmEmailChangeResult oobCode={null} />);

        expect(
            screen.getByText(verificationCopy.invalidLink.title)
        ).toBeTruthy();
        expect(confirmEmailChangeMock).not.toHaveBeenCalled();
    });

    it("sends the user to sign in again after the change", () => {
        mutationState.isSuccess = true;
        render(<ConfirmEmailChangeResult oobCode="code-1" />);

        expect(screen.getByText(changeCopy.success.title)).toBeTruthy();
        const link = screen.getByRole("link", {
            name: changeCopy.signIn,
        }) as HTMLAnchorElement;
        expect(link.getAttribute("href")).toBe("/pt-br/sign-in");
    });

    it("shows the error card with a way back to the panel", () => {
        mutationState.isError = true;
        render(<ConfirmEmailChangeResult oobCode="code-1" />);

        expect(screen.getByText(changeCopy.error.title)).toBeTruthy();
        const link = screen.getByRole("link", {
            name: verificationCopy.goToPanel,
        }) as HTMLAnchorElement;
        expect(link.getAttribute("href")).toBe("/pt-br");
    });
});
