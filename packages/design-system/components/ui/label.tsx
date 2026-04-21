import { cn } from '@repo/design-system/lib/utils';
import React, { ReactNode } from 'react';

interface LabelProps {
    htmlFor?: string;
    children: ReactNode;
    className?: string;
    required?: boolean;
}

export function Label({ htmlFor, children, className, required }: LabelProps): React.ReactElement {
    return (
        <label
            htmlFor={htmlFor}
            className={cn('mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400', className)}
        >
            {children} {required && <span className="text-error-500">*</span>}
        </label>
    );
}
