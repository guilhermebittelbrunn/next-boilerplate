import { ImageUploadInput } from "@repo/design-system/components/ui/image-upload-input";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const WHITESPACE = /\s+/;

const LABEL = "Photo";
const MAX_SIZE_BYTES = 8;

const texts = {
    choose: "Choose",
    replace: "Replace",
    remove: "Remove",
    uploading: "Uploading",
    hint: "PNG up to 8 bytes",
    alt: "Preview",
    errors: {
        tooLarge: "The file is too large",
        typeNotAllowed: "This type is not accepted",
        failed: "Upload failed",
    },
};

function describedTexts(element: HTMLElement): string[] {
    return (element.getAttribute("aria-describedby") ?? "")
        .split(WHITESPACE)
        .filter(Boolean)
        .map((id) => document.getElementById(id)?.textContent ?? "");
}

function renderPicker() {
    render(
        <ImageUploadInput
            label={LABEL}
            maxSizeBytes={MAX_SIZE_BYTES}
            texts={texts}
            upload={vi.fn()}
        />
    );
    return screen.getByLabelText(LABEL);
}

const pick = (picker: HTMLElement, file: File) =>
    fireEvent.change(picker, { target: { files: [file] } });

afterEach(cleanup);

describe("ImageUploadInput", () => {
    it("points the picker at the hint while nothing went wrong", () => {
        const picker = renderPicker();

        expect(describedTexts(picker)).toEqual([texts.hint]);
    });

    it("points the picker at a local refusal, next to the hint", () => {
        const picker = renderPicker();

        pick(
            picker,
            new File(["0123456789"], "big.png", { type: "image/png" })
        );

        expect(picker.getAttribute("aria-invalid")).toBe("true");
        expect(describedTexts(picker)).toEqual([
            texts.hint,
            texts.errors.tooLarge,
        ]);
    });

    it("drops the refusal from the description when a new pick starts", () => {
        const picker = renderPicker();

        pick(
            picker,
            new File(["0123456789"], "big.png", { type: "image/png" })
        );
        pick(picker, new File(["x"], "doc.txt", { type: "text/plain" }));

        expect(describedTexts(picker)).toEqual([
            texts.hint,
            texts.errors.typeNotAllowed,
        ]);
    });
});
