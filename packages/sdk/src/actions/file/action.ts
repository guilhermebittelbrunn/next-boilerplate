import type { Client } from "../../client/index";
import type { Response } from "../../client/type";
import type { UploadedFileDTO } from "../../types";

const PERCENT = 100;

export type UploadFileOptions = {
    onProgress?: (percent: number) => void;
};

export default class FileActions {
    // biome-ignore lint/style/noParameterProperties: SDK client pattern
    constructor(private readonly client: Client) {
        this.client = client;
    }

    async upload(
        file: File,
        options?: UploadFileOptions
    ): Promise<UploadedFileDTO> {
        const form = new FormData();
        form.append("file", file);

        // No explicit Content-Type: only the browser can write the multipart boundary.
        const { data } = await this.client.request<Response<UploadedFileDTO>>({
            url: "/files",
            method: "POST",
            data: form,
            onUploadProgress: (event) => {
                if (!(options?.onProgress && event.total)) {
                    return;
                }
                options.onProgress(
                    Math.round((event.loaded * PERCENT) / event.total)
                );
            },
        });

        return data.data;
    }
}
