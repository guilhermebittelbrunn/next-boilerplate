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
    ImageUploadInput,
    type ImageUploadInputProps,
} from "../../ui/image-upload-input";

export type HookFormImageUploadProps<T extends FieldValues> = Omit<
    ImageUploadInputProps,
    "error" | "onChange" | "value"
> & {
    control?: Control<T>;
    name: Path<T>;
    controllerProps?: Omit<ControllerProps<T>, "name" | "control" | "render">;
    hidden?: boolean;
};

export function HookFormImageUpload<T extends FieldValues>(
    props: HookFormImageUploadProps<T>
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
                        <ImageUploadInput
                            {...rest}
                            disabled={formState.isSubmitting || rest.disabled}
                            error={errorMessage}
                            id={field.name}
                            label={label}
                            onBlur={field.onBlur}
                            onChange={field.onChange}
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
