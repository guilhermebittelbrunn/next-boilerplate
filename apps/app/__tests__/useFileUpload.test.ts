import { act, renderHook, waitFor } from "@testing-library/react";
import { AxiosError, AxiosHeaders } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFileUpload } from "@/shared/hooks/useFileUpload";

const { uploadMock, activeLocale } = vi.hoisted(() => ({
    uploadMock: vi.fn(),
    activeLocale: { value: "pt-br" as "pt-br" | "en" | "es" },
}));

vi.mock("@/shared/lib/client", () => ({
    apiClient: {
        file: { upload: (...args: unknown[]) => uploadMock(...args) },
    },
}));

vi.mock("@repo/internationalization/client", () => ({
    getDictionary: () => ({ locale: activeLocale.value }),
}));

const STATUS_UNSUPPORTED_MEDIA_TYPE = 415;
const STATUS_PAYLOAD_TOO_LARGE = 413;
const STATUS_SERVICE_UNAVAILABLE = 503;

const uploadedFile = {
    path: "uploads/p1/9f1c8e30-4b7a-4c21-9f2a-3c5b0d8e1a44.jpg",
    url: "https://storage.googleapis.com/bucket/obj?X-Goog-Signature=abc",
    expiresAt: "2026-09-11T12:15:00.000Z",
    contentType: "image/jpeg",
    size: 2048,
};

const JPEG_HEAD_HEX = "ffd8ff";

const jpegFile = () =>
    new File(
        [Uint8Array.from(Buffer.from(JPEG_HEAD_HEX, "hex"))],
        "photo.jpg",
        {
            type: "image/jpeg",
        }
    );

function apiRefusal(code: string, status: number): AxiosError {
    const headers = new AxiosHeaders();
    const config = { headers, url: "/files" };
    return new AxiosError("Request failed", "ERR_BAD_REQUEST", config, {}, {
        status,
        statusText: "Error",
        headers,
        config,
        data: { error: { code } },
    } as never);
}

beforeEach(() => {
    uploadMock.mockReset();
    activeLocale.value = "pt-br";
});

describe("useFileUpload", () => {
    it("returns the uploaded reference and forwards the progress callback to the sdk", async () => {
        uploadMock.mockResolvedValue(uploadedFile);
        const onProgress = vi.fn();
        const file = jpegFile();
        const { result } = renderHook(() => useFileUpload());

        let received: unknown;
        await act(async () => {
            received = await result.current.uploadFile(file, onProgress);
        });

        expect(received).toEqual(uploadedFile);
        expect(uploadMock).toHaveBeenCalledWith(file, { onProgress });
    });

    it("reports the upload as in flight only until it settles", async () => {
        let settle: ((value: unknown) => void) | undefined;
        uploadMock.mockImplementation(
            () =>
                new Promise((resolve) => {
                    settle = resolve;
                })
        );
        const { result } = renderHook(() => useFileUpload());

        expect(result.current.isUploading).toBe(false);

        let pending: Promise<unknown> | undefined;
        act(() => {
            pending = result.current.uploadFile(jpegFile());
        });
        await waitFor(() => expect(result.current.isUploading).toBe(true));

        await act(async () => {
            settle?.(uploadedFile);
            await pending;
        });

        expect(result.current.isUploading).toBe(false);
    });

    it("stops reporting the upload as in flight when it fails", async () => {
        uploadMock.mockRejectedValue(
            apiRefusal("UPLOAD_FAILED", STATUS_SERVICE_UNAVAILABLE)
        );
        const { result } = renderHook(() => useFileUpload());

        await act(async () => {
            await expect(
                result.current.uploadFile(jpegFile())
            ).rejects.toThrow();
        });

        expect(result.current.isUploading).toBe(false);
    });

    it("rethrows the translated copy of the error code, not the transport error", async () => {
        const refusal = apiRefusal(
            "UPLOAD_FILE_TYPE_NOT_ALLOWED",
            STATUS_UNSUPPORTED_MEDIA_TYPE
        );
        uploadMock.mockRejectedValue(refusal);
        const { result } = renderHook(() => useFileUpload());

        await act(async () => {
            const thrown = await result.current
                .uploadFile(jpegFile())
                .catch((error: unknown) => error);

            expect(thrown).toBeInstanceOf(Error);
            expect(thrown).not.toBeInstanceOf(AxiosError);
            expect((thrown as Error).message).toBe(
                "Formato não aceito. Envie JPG, PNG ou WebP."
            );
        });
    });

    it("translates the refusal in the locale the panel is being read in", async () => {
        uploadMock.mockRejectedValue(
            apiRefusal("UPLOAD_FILE_TOO_LARGE", STATUS_PAYLOAD_TOO_LARGE)
        );

        activeLocale.value = "en";
        const english = renderHook(() => useFileUpload());
        await act(async () => {
            await expect(
                english.result.current.uploadFile(jpegFile())
            ).rejects.toThrow("The file exceeds the 4 MB limit.");
        });

        activeLocale.value = "es";
        const spanish = renderHook(() => useFileUpload());
        await act(async () => {
            await expect(
                spanish.result.current.uploadFile(jpegFile())
            ).rejects.toThrow("El archivo supera el límite de 4 MB.");
        });
    });

    it("answers a request that never reached the api with the generic copy", async () => {
        uploadMock.mockRejectedValue(
            new AxiosError("Network Error", "ERR_NETWORK", {
                headers: new AxiosHeaders(),
            })
        );
        const { result } = renderHook(() => useFileUpload());

        await act(async () => {
            await expect(result.current.uploadFile(jpegFile())).rejects.toThrow(
                "Um erro inesperado aconteceu"
            );
        });
    });
});
