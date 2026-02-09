import type { HTMLInputTypeAttribute } from "react";
import {
    type Control,
    Controller,
    type ControllerProps,
    type FieldValues,
    type Path,
    useFormContext,
} from "react-hook-form";
import { FormControl, FormItem, FormLabel, FormMessage } from "../../ui/form";
import { Input, type InputProps } from "../../ui/input";

interface HookFormInputProps<T extends FieldValues> extends InputProps {
    control?: Control<T>;
    name: Path<T>;
    label: string;
    placeholder?: string;
    type?: HTMLInputTypeAttribute;
    controllerProps?: Omit<ControllerProps<T>, "name" | "control" | "render">;
}

export function HookFormInput<T extends FieldValues>(
    props: HookFormInputProps<T>
): React.ReactElement {
    const { control, name, label, controllerProps, ...rest } = props;
    const { formState } = useFormContext();

    return (
        <Controller
            control={control}
            name={name}
            render={({ field, fieldState }) => {
                const errorMessage = fieldState.error?.message;

                return (
                    <FormItem>
                        <FormLabel
                            className={errorMessage ? "text-destructive" : ""}
                        >
                            {label}
                        </FormLabel>
                        <FormControl>
                            <Input
                                className={
                                    errorMessage ? "border-destructive" : ""
                                }
                                disabled={formState.isSubmitting}
                                placeholder=""
                                {...field}
                                {...rest}
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
