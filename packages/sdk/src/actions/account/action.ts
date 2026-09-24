import type { Client } from "../../client/index";
import type { Response } from "../../client/type";
import type {
    AccountConfirmation,
    AccountDataExportDTO,
    AccountDTO,
    AdvanceOnboardingRequest,
    ChangePasswordRequest,
    DeleteAccountRequest,
    OnboardingStateDTO,
    UpdateAccountRequest,
} from "../../types";

export default class AccountActions {
    // biome-ignore lint/style/noParameterProperties: SDK client pattern
    constructor(private readonly client: Client) {
        this.client = client;
    }

    async me(): Promise<AccountDTO> {
        const { data } = await this.client.request<Response<AccountDTO>>({
            url: "/account",
            method: "GET",
        });

        return data.data;
    }

    async update(body: UpdateAccountRequest): Promise<AccountDTO> {
        const { data } = await this.client.request<Response<AccountDTO>>({
            url: "/account",
            method: "PUT",
            data: body,
        });

        return data.data;
    }

    async changePassword(
        body: ChangePasswordRequest
    ): Promise<AccountConfirmation> {
        const { data } = await this.client.request<
            Response<AccountConfirmation>
        >({
            url: "/account/password",
            method: "POST",
            data: body,
        });

        return data.data;
    }

    async exportData(): Promise<AccountDataExportDTO> {
        const { data } = await this.client.request<
            Response<AccountDataExportDTO>
        >({
            url: "/account/export",
            method: "GET",
        });

        return data.data;
    }

    /**
     * Irreversible: the profile, the records and the Firebase Auth account are gone when
     * this resolves. Named apart from `delete` because every other action's `delete`
     * takes an id and issues an HTTP DELETE.
     */
    async deleteAccount(
        body: DeleteAccountRequest
    ): Promise<AccountConfirmation> {
        const { data } = await this.client.request<
            Response<AccountConfirmation>
        >({
            url: "/account/deletion",
            method: "POST",
            data: body,
        });

        return data.data;
    }

    /** `null` means there is nothing left to do: the profile predates the flow. */
    async advanceOnboarding(
        body: AdvanceOnboardingRequest
    ): Promise<OnboardingStateDTO | null> {
        const { data } = await this.client.request<
            Response<OnboardingStateDTO | null>
        >({
            url: "/account/onboarding",
            method: "POST",
            data: body,
        });

        return data.data;
    }

    async revokeSessions(): Promise<AccountConfirmation> {
        const { data } = await this.client.request<
            Response<AccountConfirmation>
        >({
            url: "/account/sessions/revoke",
            method: "POST",
        });

        return data.data;
    }
}
