import {
    HookFormInput,
    HookFormInputPassword,
} from "@repo/design-system/components/form/hookform";
import { Button } from "@repo/design-system/components/ui/button";
import { Form } from "@repo/design-system/components/ui/form";
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
} from "@testing-library/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const LABEL = "Field";
const SUBMIT = "Send";
const SETTLE = "Settle";
const MICROTASK_ROUNDS = 10;

type Values = { field: string };

type FieldComponent = typeof HookFormInput | typeof HookFormInputPassword;

function MutationForm({
    Field,
    onRequest,
}: {
    Field: FieldComponent;
    onRequest: () => void;
}) {
    const form = useForm<Values>({ defaultValues: { field: "" } });
    const [pending, setPending] = useState(false);

    const mutate = () => {
        onRequest();
        setTimeout(() => setPending(true), 0);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(mutate)}>
                <Field label={LABEL} name="field" />
                <Button loading={pending} type="submit">
                    {SUBMIT}
                </Button>
                <button onClick={() => setPending(false)} type="button">
                    {SETTLE}
                </button>
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

function submitButton(): HTMLButtonElement {
    return screen.getByRole("button", { name: SUBMIT }) as HTMLButtonElement;
}

function pressEnterLikeTheBrowser(input: HTMLInputElement) {
    const notCancelled = fireEvent.keyDown(input, { key: "Enter" });
    const defaultButton = input.form?.querySelector<HTMLButtonElement>(
        'button[type="submit"]'
    );
    if (
        notCancelled &&
        input.form &&
        defaultButton &&
        !defaultButton.disabled
    ) {
        fireEvent.submit(input.form);
    }
}

async function pressEnterAndSettle(input: HTMLInputElement) {
    await act(async () => {
        pressEnterLikeTheBrowser(input);
        for (let round = 0; round < MICROTASK_ROUNDS; round++) {
            await Promise.resolve();
        }
    });
}

function deliverPendingState() {
    act(() => {
        vi.advanceTimersByTime(0);
    });
}

beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

describe.each(fields)("%s submitted with Enter", (_name, Field) => {
    it("ignores a second Enter that arrives before the submit button locks", async () => {
        const onRequest = vi.fn();
        render(<MutationForm Field={Field} onRequest={onRequest} />);
        fireEvent.change(fieldInput(), { target: { value: "x" } });
        fieldInput().focus();

        await pressEnterAndSettle(fieldInput());
        expect(onRequest).toHaveBeenCalledTimes(1);
        expect(submitButton().disabled).toBe(false);

        await pressEnterAndSettle(fieldInput());
        expect(onRequest).toHaveBeenCalledTimes(1);

        deliverPendingState();
        expect(submitButton().disabled).toBe(true);
        expect(document.activeElement).toBe(fieldInput());
    });

    it("submits again with Enter once the request settles", async () => {
        const onRequest = vi.fn();
        render(<MutationForm Field={Field} onRequest={onRequest} />);
        fireEvent.change(fieldInput(), { target: { value: "x" } });

        await pressEnterAndSettle(fieldInput());
        deliverPendingState();
        fireEvent.click(screen.getByRole("button", { name: SETTLE }));
        expect(submitButton().disabled).toBe(false);

        await pressEnterAndSettle(fieldInput());
        expect(onRequest).toHaveBeenCalledTimes(2);
    });
});
