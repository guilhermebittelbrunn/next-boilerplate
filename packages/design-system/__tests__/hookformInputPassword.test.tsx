import { HookFormInputPassword } from "@repo/design-system/components/form/hookform";
import { Form } from "@repo/design-system/components/ui/form";
import { getDictionary } from "@repo/internationalization/client";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { afterEach, describe, expect, it } from "vitest";

const passwordToggleCopy = getDictionary().dictionary.components.inputPassword;
const LABEL = "Password";

function PasswordForm() {
    const form = useForm<{ password: string }>({
        defaultValues: { password: "" },
    });
    return (
        <Form {...form}>
            <HookFormInputPassword label={LABEL} name="password" />
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
});
