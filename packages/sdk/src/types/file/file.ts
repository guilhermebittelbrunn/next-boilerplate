export type UploadedFileDTO = {
    /** Object path in the bucket. This is the value a resource field stores. */
    path: string;
    /** Signed read URL, ready to render. It expires. */
    url: string;
    /** ISO instant after which `url` stops working. */
    expiresAt: string;
    contentType: string;
    size: number;
};
