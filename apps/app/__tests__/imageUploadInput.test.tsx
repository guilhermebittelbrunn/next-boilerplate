import {
    ImageUploadInput,
    type ImageUploadInputProps,
} from "@repo/design-system/components/ui/image-upload-input";
import { getDictionary } from "@repo/internationalization/client";
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
    useParams: () => ({ locale: "pt-br" }),
}));

const uploadTexts =
    getDictionary().dictionary.apps.app.pages.common.entities.form.photoUpload;

const BYTES_PER_KIB = 1024;
const MAX_SIZE_MIB = 4;
const MAX_SIZE_BYTES = MAX_SIZE_MIB * BYTES_PER_KIB * BYTES_PER_KIB;
const PNG_HEAD_HEX = "89504e47";
const PNG_HEAD = Uint8Array.from(Buffer.from(PNG_HEAD_HEX, "hex"));
const OBJECT_PATH = "uploads/p2/9f1c8e30-4b7a-4c21-9f2a-3c5b0d8e1a44.png";
const SIGNED_URL = "https://storage.googleapis.com/bucket/obj?X-Goog-Sig=1";

function pngFile(sizeBytes = PNG_HEAD.length): File {
    const bytes = new Uint8Array(Math.max(sizeBytes, PNG_HEAD.length));
    bytes.set(PNG_HEAD, 0);
    return new File([bytes], "photo.png", { type: "image/png" });
}

/** The picker is visually hidden but is the real, labelled control. */
const picker = () =>
    screen.getByLabelText(uploadTexts.label) as HTMLInputElement;

const pick = (file: File) =>
    fireEvent.change(picker(), { target: { files: [file] } });

function renderInput(overrides: Partial<ImageUploadInputProps> = {}) {
    const onChange = vi.fn();
    const upload = vi.fn();

    render(
        <ImageUploadInput
            label={uploadTexts.label}
            onChange={onChange}
            texts={uploadTexts}
            upload={upload}
            {...overrides}
        />
    );

    return { onChange, upload, ...overrides };
}

beforeEach(() => {
    cleanup();
});

describe("ImageUploadInput", () => {
    it("hands the form the stored path, not the signed url", async () => {
        const upload = vi
            .fn()
            .mockResolvedValue({ path: OBJECT_PATH, url: SIGNED_URL });
        const { onChange } = renderInput({ upload });

        pick(pngFile());

        await waitFor(() => expect(onChange).toHaveBeenCalledWith(OBJECT_PATH));
        expect(upload).toHaveBeenCalledTimes(1);
    });

    /**
     * Client-side refusals are a convenience — the API decides — but they must not put
     * a value in the form, and they must not spend a request.
     */
    it("refuses an oversized file without sending it", async () => {
        const { onChange, upload } = renderInput();

        pick(pngFile(MAX_SIZE_BYTES + 1));

        expect(
            await screen.findByText(uploadTexts.errors.tooLarge)
        ).toBeTruthy();
        expect(upload).not.toHaveBeenCalled();
        expect(onChange).not.toHaveBeenCalled();
    });

    it("refuses a type outside the allowlist without sending it", async () => {
        const { onChange, upload } = renderInput();

        pick(new File(["<svg />"], "logo.svg", { type: "image/svg+xml" }));

        expect(
            await screen.findByText(uploadTexts.errors.typeNotAllowed)
        ).toBeTruthy();
        expect(upload).not.toHaveBeenCalled();
        expect(onChange).not.toHaveBeenCalled();
    });

    it("shows the refusal the upload throws and leaves the field untouched", async () => {
        const refusal = "Formato não aceito. Envie JPG, PNG ou WebP.";
        const { onChange } = renderInput({
            upload: vi.fn().mockRejectedValue(new Error(refusal)),
        });

        pick(pngFile());

        expect(await screen.findByText(refusal)).toBeTruthy();
        expect(onChange).not.toHaveBeenCalled();
    });

    it("clears the reference when the image is removed", () => {
        const { onChange } = renderInput({
            previewSrc: SIGNED_URL,
            value: OBJECT_PATH,
        });

        fireEvent.click(
            screen.getByRole("button", { name: uploadTexts.remove })
        );

        expect(onChange).toHaveBeenCalledWith("");
    });

    it("offers to replace, not to choose, once a reference exists", () => {
        renderInput({ value: OBJECT_PATH });

        expect(
            screen.getByRole("button", { name: uploadTexts.replace })
        ).toBeTruthy();
        expect(screen.queryByText(uploadTexts.choose)).toBeNull();
    });
});
