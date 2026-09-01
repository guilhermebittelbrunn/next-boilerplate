import { Button } from "@base-ui/react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useState } from "react";
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

interface HookFormInputPasswordProps<T extends FieldValues> extends InputProps {
    control?: Control<T>;
    name: Path<T>;
    label: string;
    required?: boolean;
    controllerProps?: Omit<ControllerProps<T>, "name" | "control" | "render">;
    hidden?: boolean;
}

export function HookFormInputPassword<T extends FieldValues>(
    props: HookFormInputPasswordProps<T>
) {
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
    const [showPassword, setShowPassword] = useState(false);

    const toggleShowPassword = () => setShowPassword(!showPassword);

    if (hidden) {
        return null;
    }

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
                            <div className="relative">
                                <Input
                                    aria-required={required}
                                    className={
                                        errorMessage ? "border-destructive" : ""
                                    }
                                    disabled={formState.isSubmitting}
                                    {...field}
                                    {...rest}
                                    placeholder="••••••••"
                                    type={showPassword ? "text" : "password"}
                                />
                                <Button
                                    className="-translate-y-1/2 absolute top-1/2 right-2"
                                    onClick={toggleShowPassword}
                                >
                                    {showPassword ? (
                                        <EyeIcon className="h-4 w-4" />
                                    ) : (
                                        <EyeOffIcon className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </FormControl>
                        <FormMessage message={errorMessage} />
                    </FormItem>
                );
            }}
            {...controllerProps}
        />
    );
}
