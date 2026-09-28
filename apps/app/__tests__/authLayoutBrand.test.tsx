import { DEFAULT_BRAND_NAME } from "@repo/next-config/brand";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AuthLayout from "@/app/[locale]/(unauthenticated)/layout";

const renderPanel = () =>
    render(
        <AuthLayout>
            <form data-testid="auth-form" />
        </AuthLayout>
    );

beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_APP_NAME", "");
    vi.stubEnv("NEXT_PUBLIC_APP_LOGO_URL", "");
});

afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
});

describe("brand panel on the sign-in screens", () => {
    it("shows the neutral name and the generic icon when nothing is configured", () => {
        const { container } = renderPanel();

        expect(container.textContent).toContain(DEFAULT_BRAND_NAME);
        expect(
            container.querySelector('[data-slot="avatar-fallback"] svg')
        ).not.toBeNull();
        expect(container.querySelector("img")).toBeNull();
    });

    it("shows the configured name", () => {
        vi.stubEnv("NEXT_PUBLIC_APP_NAME", "QA Brand");

        const { container } = renderPanel();

        expect(container.textContent).toContain("QA Brand");
        expect(container.textContent).not.toContain(DEFAULT_BRAND_NAME);
    });

    it("carries no sample testimonial", () => {
        const { container } = renderPanel();

        expect(container.querySelector("blockquote")).toBeNull();
        expect(container.textContent).not.toContain("Sofia Davis");
        expect(container.textContent).not.toContain("Acme");
    });

    it("keeps the page content", () => {
        const { getByTestId } = renderPanel();

        expect(getByTestId("auth-form")).toBeTruthy();
    });
});
