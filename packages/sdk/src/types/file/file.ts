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

/**
 * Where an upload is stored. A personal object (the avatar) belongs to the person; an
 * organization object (a record's photo) stays with the organization when a member leaves.
 */
export type UploadScope = "personal" | "organization";
