"use client";

import { cn } from "@repo/design-system/lib/utils";
import {
    type Control,
    Controller,
    type ControllerProps,
    type FieldValues,
    type Path,
    useFormContext,
} from "react-hook-form";
import { FormControl, FormItem, FormLabel, FormMessage } from "../../ui/form";
import { Select, type SelectOption } from "../../ui/select";

export type HookFormSelectProps<T extends FieldValues> = {
    control?: Control<T>;
    name: Path<T>;
    label: string;
    options: SelectOption[];
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    triggerClassName?: string;
    size?: "sm" | "default";
    searchable?: boolean;
    searchPlaceholder?: string;
    emptyMessage?: string;
    controllerProps?: Omit<ControllerProps<T>, "name" | "control" | "render">;
    hidden?: boolean;
};

export function HookFormSelect<T extends FieldValues>(
    props: HookFormSelectProps<T>
) {
    const { formState } = useFormContext();

    const {
        control,
        name,
        label,
        options,
        placeholder,
        required = false,
        disabled = false,
        triggerClassName,
        size,
        searchable,
        searchPlaceholder,
        emptyMessage,
        controllerProps,
        hidden = false,
    } = props;

    if (hidden) {
        return null;
    }

    return (
        <Controller
            control={control}
            name={name}
            render={({ field, fieldState }) => {
                const errorMessage = fieldState.error?.message;
                const value =
                    typeof field.value === "string" ? field.value : undefined;

                return (
                    <FormItem>
                        <FormLabel invalid={Boolean(errorMessage)}>
                            {label}
                            {required ? (
                                <span
                                    aria-hidden="true"
                                    className="text-destructive"
                                >
                                    {" *"}
                                </span>
                            ) : null}
                        </FormLabel>
                        <FormControl>
                            <Select
                                disabled={disabled || formState.isSubmitting}
                                emptyMessage={emptyMessage}
                                onValueChange={(next) => {
                                    // The primitive keeps a hidden native select for form
                                    // submission, and it reports an empty value while its
                                    // options are not mounted — which happens whenever the
                                    // value only arrives after the first render. A choice is
                                    // always one of the options, so anything else is noise.
                                    if (options.some((o) => o.value === next)) {
                                        field.onChange(next);
                                    }
                                }}
                                options={options}
                                placeholder={placeholder ?? label}
                                searchable={searchable}
                                searchPlaceholder={searchPlaceholder}
                                size={size}
                                triggerClassName={cn(
                                    errorMessage ? "border-destructive" : "",
                                    "w-full",
                                    triggerClassName
                                )}
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
