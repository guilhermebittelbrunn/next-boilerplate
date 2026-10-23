"use client";

import { getDictionary } from "@repo/internationalization/client";
import type { UploadedFileDTO, UploadScope } from "@repo/sdk/src/types";
import FormattedError from "@repo/shared/utils/helpers/formattedError";
import { handleClientError } from "@repo/shared/utils/helpers/handleClientError";
import { useCallback, useState } from "react";
import { apiClient } from "@/shared/lib/client";

export type UseFileUploadOptions = {
    /** A record's photo belongs to the organization; absent keeps the file personal. */
    scope?: UploadScope;
};

/**
 * Uploads a file and reports progress. The refusal is translated here, where the locale
 * is known, and re-thrown as a plain message so presentational callers never have to
 * map an `error.code` themselves.
 */
export function useFileUpload(options: UseFileUploadOptions = {}) {
    const { scope } = options;
    const { locale } = getDictionary();
    const [isUploading, setIsUploading] = useState(false);

    const uploadFile = useCallback(
        async (
            file: File,
            onProgress?: (percent: number) => void
        ): Promise<UploadedFileDTO> => {
            setIsUploading(true);
            try {
                return await apiClient.file.upload(file, { onProgress, scope });
            } catch (error) {
                throw new Error(
                    handleClientError(new FormattedError(error, locale))
                );
            } finally {
                setIsUploading(false);
            }
        },
        [locale, scope]
    );

    return { uploadFile, isUploading };
}
