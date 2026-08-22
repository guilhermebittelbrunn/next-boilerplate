import { getDictionary } from "@repo/internationalization/client";
import { cleanup, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { panelMock } = vi.hoisted(() => ({ panelMock: vi.fn() }));

vi.mock("next/navigation", () => ({
    useParams: () => ({ locale: "pt-br" }),
}));
vi.mock("@/shared/providers/AuthRequestPanelContext", () => ({
    useAuthRequestPanel: () => panelMock(),
}));

const { ImpersonationReadOnlyNotice } = await import(
    "@/shared/components/ui/ImpersonationReadOnlyNotice"
);

const readOnlyCopy =
    getDictionary().dictionary.apps.app.pages.impersonation.readOnly;

function givenPanel(panel: {
    isImpersonating: boolean;
    impersonatedLabel?: string | null;
    impersonatedFirebaseUid?: string | null;
}) {
    panelMock.mockReturnValue({
        impersonatedFirebaseUid: null,
        impersonatedLabel: null,
        ...panel,
    });
}

beforeEach(() => {
    cleanup();
    panelMock.mockReset();
});

describe("ImpersonationReadOnlyNotice", () => {
    it("renders nothing when the user is not acting as someone else", () => {
        givenPanel({ isImpersonating: false });

        const { container } = render(<ImpersonationReadOnlyNotice />);

        expect(container.innerHTML).toBe("");
    });

    /**
     * A disabled control is skipped by screen readers, so the explanation has to be
     * announced on its own — losing the live region silently removes the only signal a
     * non-sighted admin gets.
     */
    it("announces the restriction and names the impersonated user", () => {
        givenPanel({
            isImpersonating: true,
            impersonatedFirebaseUid: "target-1234567890",
            impersonatedLabel: "readonly-check@example.com",
        });

        render(<ImpersonationReadOnlyNotice />);

        const notice = screen.getByRole("alert");
        expect(notice.textContent).toContain(readOnlyCopy.title);
        expect(notice.textContent).toContain(readOnlyCopy.description);
        expect(notice.textContent).toContain("readonly-check@example.com");
    });

    it("falls back to the truncated uid before the display name hydrates", () => {
        givenPanel({
            isImpersonating: true,
            impersonatedFirebaseUid: "target-1234567890",
            impersonatedLabel: null,
        });

        render(<ImpersonationReadOnlyNotice />);

        const notice = screen.getByRole("alert");
        expect(notice.textContent).toContain("target-1");
        expect(notice.textContent).not.toContain("target-12");
        expect(notice.textContent).not.toContain("null");
    });

    it("names nobody rather than printing a placeholder when there is no uid", () => {
        givenPanel({
            isImpersonating: true,
            impersonatedFirebaseUid: null,
            impersonatedLabel: null,
        });

        render(<ImpersonationReadOnlyNotice />);

        const notice = screen.getByRole("alert");
        expect(notice.textContent).not.toContain("null");
        expect(notice.textContent).not.toContain("undefined");
    });
});
