/** biome-ignore-all lint/complexity/noUselessFragments: empty fragment when hidden */
"use client";

import {
    type Control,
    Controller,
    type ControllerProps,
    type FieldValues,
    type Path,
    useFormContext,
} from "react-hook-form";
import { FormItem, FormMessage } from "../../ui/form";
import {
    TextareaInput,
    type TextareaInputProps,
} from "../../ui/textarea-input";

export type HookFormTextareaProps<T extends FieldValues> = Omit<
    TextareaInputProps,
    "error" | "name" | "onBlur" | "onChange" | "ref" | "value"
> & {
    control?: Control<T>;
    name: Path<T>;
    controllerProps?: Omit<ControllerProps<T>, "name" | "control" | "render">;
    hidden?: boolean;
};

export function HookFormTextarea<T extends FieldValues>(
    props: HookFormTextareaProps<T>
): React.ReactElement {
    const {
        control,
        name,
        label,
        controllerProps,
        required = false,
        hidden = false,
        hint,
        ...rest
    } = props;
    const { formState } = useFormContext();

    if (hidden) {
        return <></>;
    }

    return (
        <Controller
            control={control}
            name={name}
            render={({ field, fieldState }) => {
                const errorMessage = fieldState.error?.message;
                return (
                    <FormItem>
                        <TextareaInput
                            {...rest}
                            disabled={formState.isSubmitting || rest.disabled}
                            error={errorMessage}
                            hint={hint}
                            id={field.name}
                            label={label}
                            name={field.name}
                            onBlur={field.onBlur}
                            onChange={field.onChange}
                            ref={field.ref}
                            required={required}
                            value={field.value ?? ""}
                        />
                        <FormMessage message={errorMessage} />
                    </FormItem>
                );
            }}
            {...controllerProps}
        />
    );
}
