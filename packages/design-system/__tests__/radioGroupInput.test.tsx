import { HookFormRadioGroup } from "@repo/design-system/components/form/hookform";
import { Form } from "@repo/design-system/components/ui/form";
import { RadioGroupInput } from "@repo/design-system/components/ui/radio-group-input";
import { cleanup, render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { afterEach, describe, expect, it } from "vitest";

const FORM_ITEM_ID = /-form-item$/;

const options = [
    { value: "a", label: "Option A" },
    { value: "b", label: "Option B" },
];

function GenderForm() {
    const form = useForm<{ gender: string }>({
        defaultValues: { gender: "" },
    });
    return (
        <Form {...form}>
            <HookFormRadioGroup
                label="Gender"
                name="gender"
                options={options}
            />
        </Form>
    );
}

afterEach(cleanup);

describe("RadioGroupInput", () => {
    it("is named after its label", () => {
        render(<RadioGroupInput label="Gender" options={options} />);

        expect(screen.getByRole("radiogroup", { name: "Gender" })).toBeTruthy();
    });

    it("keeps the form control id on the group when used through the form field", () => {
        render(<GenderForm />);

        const group = screen.getByRole("radiogroup", { name: "Gender" });
        expect(group.id).toMatch(FORM_ITEM_ID);
    });

    it("gets no aria-labelledby without a label", () => {
        render(<RadioGroupInput options={options} />);

        expect(
            screen.getByRole("radiogroup").hasAttribute("aria-labelledby")
        ).toBe(false);
    });

    it("lets the caller point the group at another label", () => {
        render(
            <>
                <span id="external-label">Pick one</span>
                <RadioGroupInput
                    aria-labelledby="external-label"
                    label="Gender"
                    options={options}
                />
            </>
        );

        expect(
            screen.getByRole("radiogroup", { name: "Pick one" })
        ).toBeTruthy();
    });

    it("points each group at its own label", () => {
        render(
            <>
                <RadioGroupInput label="Gender" options={options} />
                <RadioGroupInput label="Theme" options={options} />
            </>
        );

        const gender = screen.getByRole("radiogroup", { name: "Gender" });
        const theme = screen.getByRole("radiogroup", { name: "Theme" });
        expect(gender.getAttribute("aria-labelledby")).not.toBe(
            theme.getAttribute("aria-labelledby")
        );
    });
});
