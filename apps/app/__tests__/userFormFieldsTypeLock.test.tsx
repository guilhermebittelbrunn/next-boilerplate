import { Form } from "@repo/design-system/components/ui/form";
import { UserType } from "@repo/sdk/src/types";
import { setCookie } from "@repo/shared/utils/helpers/cookies";
import { cleanup, render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
    useParams: () => ({ locale: "pt-br" }),
}));

const { UserFormFields } = await import(
    "@/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(components)/UserFormFields"
);

const TYPE_HINT = "Você não pode tirar o seu próprio acesso de administrador.";

function EditForm({ lockType }: { lockType?: boolean }) {
    const form = useForm({
        defaultValues: {
            email: "admin@example.com",
            displayName: "Ana",
            type: UserType.ADMIN,
        },
    });

    return (
        <Form {...form}>
            <form>
                <UserFormFields lockType={lockType} mode="update" />
            </form>
        </Form>
    );
}

function typeSelect() {
    return screen.getByRole("combobox");
}

beforeEach(() => {
    cleanup();
    const ONE_HOUR_IN_SECONDS = 3600;
    setCookie("x-locale", "pt-br", ONE_HOUR_IN_SECONDS);
});

describe("UserFormFields type lock", () => {
    it("disables the type select and shows the hint when locked", () => {
        render(<EditForm lockType />);

        expect(typeSelect()).toHaveProperty("disabled", true);
        expect(screen.getByText(TYPE_HINT)).toBeTruthy();
    });

    it("links the hint to the type select for assistive technology", () => {
        render(<EditForm lockType />);

        const describedBy = typeSelect().getAttribute("aria-describedby") ?? "";
        const descriptionTexts = describedBy
            .split(" ")
            .map((id) => document.getElementById(id)?.textContent);

        expect(descriptionTexts).toContain(TYPE_HINT);
    });

    it("leaves the select enabled with no hint by default", () => {
        render(<EditForm />);

        expect(typeSelect()).toHaveProperty("disabled", false);
        expect(screen.queryByText(TYPE_HINT)).toBeNull();
    });
});
