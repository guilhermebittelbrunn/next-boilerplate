import { HookFormInputPassword } from "@repo/design-system/components/form/hookform";
import { Form } from "@repo/design-system/components/ui/form";
import { getDictionary } from "@repo/internationalization/client";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { afterEach, describe, expect, it } from "vitest";

const passwordToggleCopy = getDictionary().dictionary.components.inputPassword;
const LABEL = "Password";

const DEFAULT_PLACEHOLDER = "••••••••";

function PasswordForm(
    fieldProps: Partial<Parameters<typeof HookFormInputPassword>[0]>
) {
    const form = useForm<{ password: string }>({
        defaultValues: { password: "" },
    });
    return (
        <Form {...form}>
            <HookFormInputPassword
                label={LABEL}
                name="password"
                {...fieldProps}
            />
        </Form>
    );
}

afterEach(cleanup);

describe("HookFormInputPassword", () => {
    it("labels the input itself, not its wrapper", () => {
        render(<PasswordForm />);

        expect(screen.getByLabelText(LABEL).tagName).toBe("INPUT");
    });

    it("names the visibility toggle after the action it performs", () => {
        render(<PasswordForm />);

        const toggle = screen.getByRole("button", {
            name: passwordToggleCopy.show,
        });
        expect(screen.getByLabelText(LABEL).getAttribute("type")).toBe(
            "password"
        );

        fireEvent.click(toggle);

        expect(
            screen.getByRole("button", { name: passwordToggleCopy.hide })
        ).toBeTruthy();
        expect(screen.getByLabelText(LABEL).getAttribute("type")).toBe("text");
    });

    it("shows the placeholder the caller passes", () => {
        render(<PasswordForm placeholder="Your password" />);

        expect(screen.getByLabelText(LABEL).getAttribute("placeholder")).toBe(
            "Your password"
        );
    });

    it("falls back to the masked placeholder", () => {
        render(<PasswordForm />);

        expect(screen.getByLabelText(LABEL).getAttribute("placeholder")).toBe(
            DEFAULT_PLACEHOLDER
        );
    });

    it("still toggles visibility when the caller passes a type", () => {
        render(<PasswordForm type="password" />);

        fireEvent.click(
            screen.getByRole("button", { name: passwordToggleCopy.show })
        );

        expect(screen.getByLabelText(LABEL).getAttribute("type")).toBe("text");
    });
});
