import {
    HookFormInput,
    HookFormInputPassword,
} from "@repo/design-system/components/form/hookform";
import { Form } from "@repo/design-system/components/ui/form";
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import { useForm } from "react-hook-form";
import { afterEach, describe, expect, it } from "vitest";

const LABEL = "Field";

type Values = { field: string };

type FieldComponent = typeof HookFormInput | typeof HookFormInputPassword;

function deferred() {
    let settle: (() => void) | undefined;
    const promise = new Promise<void>((resolvePromise) => {
        settle = resolvePromise;
    });
    return { promise, resolve: () => settle?.() };
}

function SubmittingForm({
    Field,
    pending,
    disabled,
}: {
    Field: FieldComponent;
    pending: Promise<void>;
    disabled?: boolean;
}) {
    const form = useForm<Values>({ defaultValues: { field: "" } });
    return (
        <Form {...form}>
            <form
                data-testid="form"
                onSubmit={form.handleSubmit(() => pending)}
            >
                <Field
                    label={LABEL}
                    name="field"
                    {...(disabled ? { disabled } : {})}
                />
            </form>
        </Form>
    );
}

const fields: [string, FieldComponent][] = [
    ["HookFormInput", HookFormInput],
    ["HookFormInputPassword", HookFormInputPassword],
];

function fieldInput(): HTMLInputElement {
    return screen.getByLabelText(LABEL) as HTMLInputElement;
}

async function startSubmit() {
    await act(async () => {
        fireEvent.submit(screen.getByTestId("form"));
        await Promise.resolve();
    });
}

afterEach(cleanup);

describe.each(fields)("%s while the form submits", (_name, Field) => {
    it("stays enabled but read-only", async () => {
        const pending = deferred();
        render(<SubmittingForm Field={Field} pending={pending.promise} />);

        await startSubmit();

        await waitFor(() => expect(fieldInput().readOnly).toBe(true));
        expect(fieldInput().disabled).toBe(false);

        await act(async () => pending.resolve());
    });

    it("keeps the focus on the field that submitted", async () => {
        const pending = deferred();
        render(<SubmittingForm Field={Field} pending={pending.promise} />);
        fieldInput().focus();

        await startSubmit();

        expect(document.activeElement).toBe(fieldInput());

        await act(async () => pending.resolve());
    });

    it("accepts typing again once the submit settles", async () => {
        const pending = deferred();
        render(<SubmittingForm Field={Field} pending={pending.promise} />);

        await startSubmit();
        await act(async () => pending.resolve());

        await waitFor(() => expect(fieldInput().readOnly).toBe(false));
    });

    it("stays disabled when the caller disables it", async () => {
        const pending = deferred();
        render(
            <SubmittingForm disabled Field={Field} pending={pending.promise} />
        );
        expect(fieldInput().disabled).toBe(true);

        await startSubmit();

        expect(fieldInput().disabled).toBe(true);

        await act(async () => pending.resolve());
    });
});
