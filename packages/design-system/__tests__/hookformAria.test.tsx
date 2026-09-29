import {
    HookFormDateInput,
    HookFormImageUpload,
    HookFormInput,
    HookFormInputPassword,
    HookFormRadioGroup,
    HookFormSelect,
    HookFormSwitch,
    HookFormTextarea,
} from "@repo/design-system/components/form/hookform";
import { Form } from "@repo/design-system/components/ui/form";
import { act, cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { type UseFormReturn, useForm } from "react-hook-form";
import { afterEach, describe, expect, it, vi } from "vitest";

const WHITESPACE = /\s+/;

const ERROR_MESSAGE = "This field needs attention";
const FIELD = "field";

type Values = { field: unknown };

let formApi: UseFormReturn<Values> | undefined;

function Harness({ children }: { children: ReactNode }) {
    const form = useForm<Values>({ defaultValues: { field: undefined } });
    formApi = form;
    return <Form {...form}>{children}</Form>;
}

const uploadTexts = {
    choose: "Choose",
    replace: "Replace",
    remove: "Remove",
    uploading: "Uploading",
    hint: "PNG up to 4 MB",
    alt: "Preview",
    errors: {
        tooLarge: "Too large",
        typeNotAllowed: "Type not allowed",
        failed: "Failed",
    },
};

type Scenario = {
    name: string;
    field: ReactNode;
    control: () => HTMLElement;
};

const LABEL = "Field label";

const scenarios: Scenario[] = [
    {
        name: "HookFormInput",
        field: <HookFormInput label={LABEL} name={FIELD} />,
        control: () => screen.getByLabelText(LABEL),
    },
    {
        name: "HookFormInputPassword",
        field: <HookFormInputPassword label={LABEL} name={FIELD} />,
        control: () => screen.getByLabelText(LABEL),
    },
    {
        name: "HookFormSelect",
        field: (
            <HookFormSelect
                label={LABEL}
                name={FIELD}
                options={[{ value: "a", label: "Option A" }]}
            />
        ),
        control: () => screen.getByRole("combobox"),
    },
    {
        name: "HookFormTextarea",
        field: <HookFormTextarea label={LABEL} name={FIELD} />,
        control: () => screen.getByLabelText(LABEL),
    },
    {
        name: "HookFormRadioGroup",
        field: (
            <HookFormRadioGroup
                label={LABEL}
                name={FIELD}
                options={[
                    { value: "a", label: "Option A" },
                    { value: "b", label: "Option B" },
                ]}
            />
        ),
        control: () => screen.getByRole("radiogroup"),
    },
    {
        name: "HookFormDateInput",
        field: <HookFormDateInput label={LABEL} name={FIELD} />,
        control: () => screen.getByLabelText(LABEL),
    },
    {
        name: "HookFormImageUpload",
        field: (
            <HookFormImageUpload
                label={LABEL}
                name={FIELD}
                texts={uploadTexts}
                upload={vi.fn()}
            />
        ),
        control: () => screen.getByLabelText(LABEL),
    },
    {
        name: "HookFormSwitch",
        field: <HookFormSwitch label={LABEL} name={FIELD} />,
        control: () => screen.getByRole("switch"),
    },
];

function describedByIds(control: HTMLElement): string[] {
    return (control.getAttribute("aria-describedby") ?? "")
        .split(WHITESPACE)
        .filter(Boolean);
}

function describingMessages(control: HTMLElement): string[] {
    return describedByIds(control)
        .map((id) => document.getElementById(id))
        .filter(
            (element): element is HTMLElement =>
                element?.getAttribute("data-slot") === "form-message"
        )
        .map((element) => element.textContent ?? "");
}

afterEach(() => {
    cleanup();
    formApi = undefined;
});

describe.each(scenarios)("$name", ({ field, control }) => {
    it("is not flagged while the field has no error", () => {
        render(<Harness>{field}</Harness>);

        expect(control().getAttribute("aria-invalid")).not.toBe("true");
        expect(describingMessages(control())).toEqual([]);
    });

    it("flags the focusable control and points it at the error message", () => {
        render(<Harness>{field}</Harness>);

        act(() => {
            formApi?.setError(FIELD, { message: ERROR_MESSAGE });
        });

        expect(control().getAttribute("aria-invalid")).toBe("true");
        expect(describingMessages(control())).toEqual([ERROR_MESSAGE]);
    });

    it("drops the flag and the reference once the error clears", () => {
        render(<Harness>{field}</Harness>);

        act(() => {
            formApi?.setError(FIELD, { message: ERROR_MESSAGE });
        });
        act(() => {
            formApi?.clearErrors(FIELD);
        });

        expect(control().getAttribute("aria-invalid")).not.toBe("true");
        expect(describingMessages(control())).toEqual([]);
    });
});
