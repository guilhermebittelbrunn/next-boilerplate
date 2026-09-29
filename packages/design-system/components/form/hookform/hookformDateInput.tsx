/** biome-ignore-all lint/complexity/noUselessFragments: empty fragment when hidden */
"use client";

import {
    type Control,
    type ControllerProps,
    type FieldValues,
    type Path,
    useFormContext,
} from "react-hook-form";
import { DateInput, type DateInputProps } from "../../ui/date-input";
import { FormControl, FormField, FormItem, FormMessage } from "../../ui/form";

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
        <FormField
            control={control}
            name={name}
            render={({ field, fieldState }) => {
                const errorMessage = fieldState.error?.message;
                return (
                    <FormItem>
                        <FormControl>
                            <DateInput
                                {...rest}
                                disabled={
                                    formState.isSubmitting || rest.disabled
                                }
                                error={errorMessage}
                                id={field.name}
                                label={label}
                                onBlur={field.onBlur}
                                onChange={field.onChange}
                                ref={field.ref}
                                required={required}
                                value={field.value ?? ""}
                            />
                        </FormControl>
                        <FormMessage message={errorMessage} />
                    </FormItem>
                );
            }}
            {...controllerProps}
        />
    );
}
