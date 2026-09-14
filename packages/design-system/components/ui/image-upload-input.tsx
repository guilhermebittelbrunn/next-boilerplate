"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Progress } from "@repo/design-system/components/ui/progress";
import ResponsiveImage from "@repo/design-system/components/ui/responsive-image";
import { cn } from "@repo/design-system/lib/utils";
import { type ChangeEvent, useId, useRef, useState } from "react";
import { Label } from "./label";

const DEFAULT_MAX_SIZE_BYTES = 4 * 1024 * 1024;
const DEFAULT_ACCEPT = ["image/jpeg", "image/png", "image/webp"];
const PREVIEW_SIZE = 64;
const FULL_PERCENT = 100;

export type ImageUploadInputTexts = {
    choose: string;
    replace: string;
    remove: string;
    uploading: string;
    hint: string;
    alt: string;
    errors: {
        tooLarge: string;
        typeNotAllowed: string;
        failed: string;
    };
};

export type ImageUploadInputProps = {
    id?: string;
    label?: string;
    required?: boolean;
    error?: string;
    disabled?: boolean;
    /** Accepted MIME types, handed to the picker and checked before sending. */
    accept?: string[];
    maxSizeBytes?: number;
    /** The stored reference — an object path or a URL. This is the form value. */
    value?: string;
    /** Displayable URL for `value`. Separate because a bucket path does not render. */
    previewSrc?: string | null;
    onChange?: (value: string) => void;
    onBlur?: () => void;
    /** Injected by the app: the design system does not know the SDK. */
    upload: (
        file: File,
        onProgress: (percent: number) => void
    ) => Promise<{ path: string; url: string }>;
    texts: ImageUploadInputTexts;
    className?: string;
};

export function ImageUploadInput({
    id,
    label,
    required = false,
    error,
    disabled = false,
    accept = DEFAULT_ACCEPT,
    maxSizeBytes = DEFAULT_MAX_SIZE_BYTES,
    value = "",
    previewSrc,
    onChange,
    onBlur,
    upload,
    texts,
    className,
}: ImageUploadInputProps) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const hintId = `${inputId}-hint`;
    const inputRef = useRef<HTMLInputElement>(null);

    const [progress, setProgress] = useState<number | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);
    const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);

    const isUploading = progress !== null;
    const previewUrl = value ? (uploadedPreview ?? previewSrc ?? null) : null;
    const isInvalid = Boolean(error || fileError);

    const rejectFile = (message: string) => {
        setFileError(message);
        onBlur?.();
    };

    async function handleFile(file: File) {
        if (file.size > maxSizeBytes) {
            rejectFile(texts.errors.tooLarge);
            return;
        }

        if (file.type && !accept.includes(file.type)) {
            rejectFile(texts.errors.typeNotAllowed);
            return;
        }

        setProgress(0);
        try {
            const uploaded = await upload(file, setProgress);
            setUploadedPreview(uploaded.url);
            onChange?.(uploaded.path);
        } catch (uploadError) {
            const message =
                uploadError instanceof Error && uploadError.message
                    ? uploadError.message
                    : texts.errors.failed;
            setFileError(message);
        } finally {
            setProgress(null);
            onBlur?.();
        }
    }

    async function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        // Clearing lets the same file be picked again after a refusal, which the
        // picker would otherwise treat as "no change" and never report.
        event.target.value = "";
        setFileError(null);

        if (file) {
            await handleFile(file);
        }
    }

    const handleRemove = () => {
        setUploadedPreview(null);
        setFileError(null);
        onChange?.("");
        onBlur?.();
    };

    return (
        <div
            className={cn("grid gap-2", className)}
            data-slot="image-upload-input"
        >
            {label ? (
                <Label
                    htmlFor={inputId}
                    invalid={isInvalid}
                    required={required}
                >
                    {label}
                </Label>
            ) : null}

            <input
                accept={accept.join(",")}
                aria-describedby={hintId}
                aria-invalid={isInvalid}
                className="sr-only"
                disabled={disabled || isUploading}
                id={inputId}
                onChange={handleInputChange}
                ref={inputRef}
                type="file"
            />

            <div className="flex items-center gap-4">
                {previewUrl ? (
                    <ResponsiveImage
                        alt={texts.alt}
                        height={PREVIEW_SIZE}
                        priority={false}
                        src={previewUrl}
                        unoptimized
                        width={PREVIEW_SIZE}
                    />
                ) : null}

                <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            aria-describedby={hintId}
                            className={cn(
                                isInvalid ? "border-destructive" : ""
                            )}
                            disabled={disabled || isUploading}
                            onClick={() => inputRef.current?.click()}
                            type="button"
                            variant="outline"
                        >
                            {resolveTriggerLabel({
                                isUploading,
                                hasValue: Boolean(value),
                                texts,
                            })}
                        </Button>

                        {value && !isUploading ? (
                            <Button
                                disabled={disabled}
                                onClick={handleRemove}
                                type="button"
                                variant="ghost"
                            >
                                {texts.remove}
                            </Button>
                        ) : null}
                    </div>

                    <p
                        className="text-muted-foreground text-xs"
                        id={hintId}
                    >
                        {texts.hint}
                    </p>
                </div>
            </div>

            {isUploading ? (
                <div aria-live="polite" role="status">
                    <Progress value={progress ?? 0} />
                    <span className="sr-only">
                        {`${texts.uploading} ${Math.min(progress ?? 0, FULL_PERCENT)}%`}
                    </span>
                </div>
            ) : null}

            {fileError ? (
                <p className="text-destructive text-sm">{fileError}</p>
            ) : null}
        </div>
    );
}

function resolveTriggerLabel({
    isUploading,
    hasValue,
    texts,
}: {
    isUploading: boolean;
    hasValue: boolean;
    texts: ImageUploadInputTexts;
}): string {
    if (isUploading) {
        return texts.uploading;
    }
    return hasValue ? texts.replace : texts.choose;
}
