import type { Client } from "../../client/index";
import type { Response } from "../../client/type";
import type {
    BillingSummaryDTO,
    CreateCheckoutRequest,
    OpenPortalRequest,
    PaymentPlansDTO,
    PaymentRedirectDTO,
} from "../../types";

export default class PaymentsActions {
    // biome-ignore lint/style/noParameterProperties: SDK client pattern
    constructor(private readonly client: Client) {
        this.client = client;
    }

    async listPlans(): Promise<PaymentPlansDTO> {
        const { data } = await this.client.request<Response<PaymentPlansDTO>>({
            url: "/payments/plans",
            method: "GET",
        });

        return data.data;
    }

    async createCheckout(
        body: CreateCheckoutRequest
    ): Promise<PaymentRedirectDTO> {
        const { data } = await this.client.request<
            Response<PaymentRedirectDTO>
        >({
            url: "/payments/checkout",
            method: "POST",
            data: body,
        });

        return data.data;
    }

    async openPortal(
        body: OpenPortalRequest = {}
    ): Promise<PaymentRedirectDTO> {
        const { data } = await this.client.request<
            Response<PaymentRedirectDTO>
        >({
            url: "/payments/portal",
            method: "POST",
            data: body,
        });

        return data.data;
    }

    async summary(): Promise<BillingSummaryDTO> {
        const { data } = await this.client.request<Response<BillingSummaryDTO>>(
            {
                url: "/payments/summary",
                method: "GET",
            }
        );

        return data.data;
    }
}
