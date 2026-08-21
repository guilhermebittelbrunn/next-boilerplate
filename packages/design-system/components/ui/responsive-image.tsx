'use client';

import { cn } from '@repo/design-system/lib/utils';
import Image from 'next/image';
import { useState } from 'react';

interface ResponsiveImageProps {
    src?: string;
    alt: string;
    width: number;
    height: number;
    className?: string;
    priority?: boolean;
}

export default function ResponsiveImage({
    src,
    alt,
    width,
    height,
    className,
    priority = false,
}: ResponsiveImageProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    if (!src) {
        return <></>;
    }

    return (
        <div
            className={cn('relative overflow-hidden rounded-full', className)}
            style={{ width, height }}
        >
            {isLoading && (
                <div className="absolute inset-0 animate-pulse bg-linear-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700" />
            )}

            {hasError && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                    </svg>
                </div>
            )}

            {!hasError && (
                <Image
                    src={src!}
                    alt={alt}
                    fill
                    className={cn(
                        'w-full object-cover transition-opacity duration-300',
                        isLoading ? 'opacity-0' : 'opacity-100',
                    )}
                    priority={priority}
                    onLoad={() => setIsLoading(false)}
                    onError={() => {
                        setIsLoading(false);
                        setHasError(true);
                    }}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
            )}
        </div>
    );
}
