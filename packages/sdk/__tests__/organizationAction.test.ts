import { beforeEach, describe, expect, it, vi } from "vitest";
import OrganizationActions from "../src/actions/organization/action";
import type { Client } from "../src/client/index";

const requestMock = vi.fn();
const client = { request: requestMock } as unknown as Client;
const actions = new OrganizationActions(client);

/** A base64url token of 32 random bytes is 43 characters long. */
const TOKEN_LENGTH = 43;
const TOKEN = "a".repeat(TOKEN_LENGTH);

beforeEach(() => {
    requestMock.mockReset();
    requestMock.mockResolvedValue({ data: { data: { ok: true } } });
});

describe("OrganizationActions", () => {
    it("sends the invitation token in the body, never in the url", async () => {
        await actions.previewInvitation(TOKEN);
        await actions.acceptInvitation(TOKEN);

        expect(requestMock).toHaveBeenNthCalledWith(1, {
            url: "/invitations/preview",
            method: "POST",
            data: { token: TOKEN },
        });
        expect(requestMock).toHaveBeenNthCalledWith(2, {
            url: "/invitations/accept",
            method: "POST",
            data: { token: TOKEN },
        });
    });

    it("encodes the ids it puts in the path", async () => {
        await actions.removeMember("a/b");
        await actions.revokeInvitation("c?d");

        expect(requestMock).toHaveBeenNthCalledWith(1, {
            url: "/organization/members/a%2Fb",
            method: "DELETE",
        });
        expect(requestMock).toHaveBeenNthCalledWith(2, {
            url: "/organization/invitations/c%3Fd",
            method: "DELETE",
        });
    });

    it("posts the invitation and answers its data", async () => {
        const body = {
            email: "qa-teams-organizations@example.com",
            locale: "pt-br" as const,
        };

        const result = await actions.invite(body);

        expect(result).toEqual({ ok: true });
        expect(requestMock).toHaveBeenCalledWith({
            url: "/organization/invitations",
            method: "POST",
            data: body,
        });
    });

    it("posts the ownership transfer to the encoded member and answers its data", async () => {
        requestMock.mockResolvedValue({
            data: { data: { ownerUserId: "a/b" } },
        });

        const result = await actions.transferOwnership("a/b");

        expect(result).toEqual({ ownerUserId: "a/b" });
        expect(requestMock).toHaveBeenCalledWith({
            url: "/organization/members/a%2Fb/ownership",
            method: "POST",
        });
    });
});
