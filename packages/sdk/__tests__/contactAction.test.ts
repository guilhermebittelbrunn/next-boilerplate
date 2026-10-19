import { beforeEach, describe, expect, it, vi } from "vitest";
import ContactActions from "../src/actions/contact/action";
import type { Client } from "../src/client/index";

const requestMock = vi.fn();
const client = { request: requestMock } as unknown as Client;

beforeEach(() => {
    requestMock.mockReset();
});

describe("ContactActions.send", () => {
    it("posts the message to the public contact endpoint and answers its data", async () => {
        const message = {
            name: "Ana Souza",
            email: "qa-contact-support@example.com",
            message: "Quero falar sobre o plano Enterprise.",
            locale: "pt-br",
        };
        requestMock.mockResolvedValue({ data: { data: { sent: true } } });

        const result = await new ContactActions(client).send(message);

        expect(result).toEqual({ sent: true });
        expect(requestMock).toHaveBeenCalledWith({
            url: "/contact",
            method: "POST",
            data: message,
        });
    });
});
