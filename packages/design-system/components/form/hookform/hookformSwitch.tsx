/** biome-ignore-all lint/complexity/noUselessFragments: empty fragment when hidden */
"use client";

import {
  type Control,
  type FieldValues,
  type Path,
  useFormContext,
} from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../ui/form";
import { Switch, type SwitchProps } from "../../ui/switch";

export type HookFormSwitchProps<T extends FieldValues> = Omit<
  SwitchProps,
  "checked" | "onCheckedChange" | "defaultChecked" | "label"
> & {
  control?: Control<T>;
  name: Path<T>;
  hidden?: boolean;
  description?: string;
  label?: string;
};

export function HookFormSwitch<T extends FieldValues>(
  props: HookFormSwitchProps<T>
): React.ReactElement {
  const {
    control,
    name,
    hidden = false,
    label,
    description,
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
            <div className="flex flex-row items-center gap-3">
              {label ? (
                <FormLabel className="mb-0">{label}</FormLabel>
              ) : null}
              <FormControl>
                <Switch
                  {...rest}
                  checked={Boolean(field.value)}
                  disabled={formState.isSubmitting || rest.disabled}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </div>
            {description ? (
              <FormDescription className="sr-only">
                {description}
              </FormDescription>
            ) : null}
            <FormMessage message={errorMessage} />
          </FormItem>
        );
      }}
    />
  );
}
