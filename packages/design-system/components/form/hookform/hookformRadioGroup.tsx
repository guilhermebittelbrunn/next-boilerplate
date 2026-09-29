/** biome-ignore-all lint/complexity/noUselessFragments: empty fragment when hidden */
"use client";

import {
    type Control,
    type ControllerProps,
    type FieldValues,
    type Path,
    useFormContext,
} from "react-hook-form";
import { FormControl, FormField, FormItem, FormMessage } from "../../ui/form";
import {
    RadioGroupInput,
    type RadioGroupInputProps,
} from "../../ui/radio-group-input";

export type HookFormRadioGroupProps<T extends FieldValues> = Omit<
    RadioGroupInputProps,
    "value" | "onValueChange" | "error"
> & {
    control?: Control<T>;
    name: Path<T>;
    controllerProps?: Omit<ControllerProps<T>, "name" | "control" | "render">;
    hidden?: boolean;
};

export function HookFormRadioGroup<T extends FieldValues>(
    props: HookFormRadioGroupProps<T>
): React.ReactElement {
    const {
        control,
        name,
        controllerProps,
        hidden = false,
        disabled: disabledFromProps,
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
                const value = field.value ?? "";
                return (
                    <FormItem>
                        <FormControl>
                            <RadioGroupInput
                                {...rest}
                                disabled={
                                    formState.isSubmitting ||
                                    Boolean(disabledFromProps)
                                }
                                error={errorMessage}
                                onValueChange={field.onChange}
                                value={value}
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
