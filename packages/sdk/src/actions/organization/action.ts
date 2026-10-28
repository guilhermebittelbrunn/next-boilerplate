import type { Client } from "../../client/index";
import type { Response } from "../../client/type";
import type {
    AcceptOrganizationInvitationResponse,
    CreateOrganizationInvitationRequest,
    CreateOrganizationInvitationResponse,
    OrganizationDTO,
    OrganizationInvitationDTO,
    OrganizationInvitationPreviewDTO,
    OrganizationMemberDTO,
    TransferOrganizationOwnershipResponse,
} from "../../types";

export default class OrganizationActions {
    // biome-ignore lint/style/noParameterProperties: SDK client pattern
    constructor(private readonly client: Client) {
        this.client = client;
    }

    async get(): Promise<OrganizationDTO> {
        const { data } = await this.client.request<Response<OrganizationDTO>>({
            url: "/organization",
            method: "GET",
        });

        return data.data;
    }

    async listMembers(): Promise<OrganizationMemberDTO[]> {
        const { data } = await this.client.request<
            Response<OrganizationMemberDTO[]>
        >({
            url: "/organization/members",
            method: "GET",
        });

        return data.data;
    }

    async removeMember(userId: string): Promise<void> {
        await this.client.request({
            url: `/organization/members/${encodeURIComponent(userId)}`,
            method: "DELETE",
        });
    }

    async transferOwnership(
        userId: string
    ): Promise<TransferOrganizationOwnershipResponse> {
        const { data } = await this.client.request<
            Response<TransferOrganizationOwnershipResponse>
        >({
            url: `/organization/members/${encodeURIComponent(userId)}/ownership`,
            method: "POST",
        });

        return data.data;
    }

    async leave(): Promise<void> {
        await this.client.request({
            url: "/organization/leave",
            method: "POST",
        });
    }

    async listInvitations(): Promise<OrganizationInvitationDTO[]> {
        const { data } = await this.client.request<
            Response<OrganizationInvitationDTO[]>
        >({
            url: "/organization/invitations",
            method: "GET",
        });

        return data.data;
    }

    async invite(
        body: CreateOrganizationInvitationRequest
    ): Promise<CreateOrganizationInvitationResponse> {
        const { data } = await this.client.request<
            Response<CreateOrganizationInvitationResponse>
        >({
            url: "/organization/invitations",
            method: "POST",
            data: body,
        });

        return data.data;
    }

    async revokeInvitation(id: string): Promise<void> {
        await this.client.request({
            url: `/organization/invitations/${encodeURIComponent(id)}`,
            method: "DELETE",
        });
    }

    /** Public: the token travels in the body so it stays out of access logs. */
    async previewInvitation(
        token: string
    ): Promise<OrganizationInvitationPreviewDTO> {
        const { data } = await this.client.request<
            Response<OrganizationInvitationPreviewDTO>
        >({
            url: "/invitations/preview",
            method: "POST",
            data: { token },
        });

        return data.data;
    }

    async acceptInvitation(
        token: string
    ): Promise<AcceptOrganizationInvitationResponse> {
        const { data } = await this.client.request<
            Response<AcceptOrganizationInvitationResponse>
        >({
            url: "/invitations/accept",
            method: "POST",
            data: { token },
        });

        return data.data;
    }
}
