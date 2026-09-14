import { cn } from '@repo/design-system/lib/utils';
import type { ComponentProps } from 'react';

type LabelProps = ComponentProps<'label'> & {
    required?: boolean;
    invalid?: boolean;
};

export function Label({
    children,
    className,
    invalid,
    required,
    ...props
}: LabelProps) {
    return (
        <label
            className={cn(
                'mb-1.5 block text-sm font-medium',
                invalid
                    ? 'text-destructive dark:text-destructive'
                    : 'text-gray-700 dark:text-gray-400',
                className
            )}
            {...props}
        >
            {children} {required && <span className="text-error-500">*</span>}
        </label>
    );
}
