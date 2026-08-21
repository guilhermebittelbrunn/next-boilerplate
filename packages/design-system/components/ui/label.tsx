import { cn } from '@repo/design-system/lib/utils';
import type { ComponentProps } from 'react';

type LabelProps = ComponentProps<'label'> & {
    required?: boolean;
};

export function Label({
    children,
    className,
    required,
    ...props
}: LabelProps) {
    return (
        <label
            className={cn(
                'mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400',
                className
            )}
            {...props}
        >
            {children} {required && <span className="text-error-500">*</span>}
        </label>
    );
}
