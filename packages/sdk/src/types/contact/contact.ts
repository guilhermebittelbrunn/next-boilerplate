export type ContactMessageRequest = {
    name: string;
    email: string;
    message: string;
    /** Language of the email the support inbox receives. Absent falls back to the fork's default. */
    locale?: string;
};

export type ContactMessageSent = { sent: true };
