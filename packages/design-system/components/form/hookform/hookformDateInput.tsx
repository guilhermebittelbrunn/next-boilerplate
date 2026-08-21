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
    DateInput,
    type DateInputProps,
} from "../../ui/date-input";

export type HookFormDateInputProps<T extends FieldValues> = Omit<
    DateInputProps,
    "error" | "onChange" | "value"
> & {
    control?: Control<T>;
    name: Path<T>;
    controllerProps?: Omit<ControllerProps<T>, "name" | "control" | "render">;
    hidden?: boolean;
};

export function HookFormDateInput<T extends FieldValues>(
    props: HookFormDateInputProps<T>
): React.ReactElement {
    const {
        control,
        name,
        label,
        controllerProps,
        required = false,
        hidden = false,
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
                        <DateInput
                            {...rest}
                            disabled={formState.isSubmitting || rest.disabled}
                            error={errorMessage}
                            id={field.name}
                            label={label}
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
