"use client";

import {
    Alert,
    AlertDescription,
} from "@repo/design-system/components/ui/alert";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@repo/design-system/components/ui/card";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import { getDictionary } from "@repo/internationalization/client";
import {
    type AccountDTO,
    LIVE_SUBSCRIPTION_STATUSES,
    type PlanDTO,
    type SubscriptionStateDTO,
    type SubscriptionStatus,
} from "@repo/sdk/src/types";
import { useSearchParams } from "next/navigation";
import {
    describePlanPrice,
    formatPeriodEnd,
} from "@/shared/lib/formatPlanPrice";
import { useAuthRequestPanel } from "@/shared/providers/AuthRequestPanelContext";
import { useCheckoutConfirmation } from "../(hooks)/useCheckoutConfirmation";
import { useListPlans } from "../(hooks)/useListPlans";
import { usePaymentsMutations } from "../(hooks)/usePaymentsMutations";
import { AccountBillingPlaceholder } from "./AccountBillingPlaceholder";
import { BillingPlanCard } from "./BillingPlanCard";

const PAYMENT_ISSUE_STATUSES: readonly SubscriptionStatus[] = [
    "past_due",
    "unpaid",
];

const isLive = (
    subscription: SubscriptionStateDTO | null
): subscription is SubscriptionStateDTO =>
    subscription !== null &&
    LIVE_SUBSCRIPTION_STATUSES.includes(subscription.status);

const badgeVariantFor = (status: SubscriptionStatus) => {
    if (PAYMENT_ISSUE_STATUSES.includes(status)) {
        return "destructive" as const;
    }
    return status === "active" || status === "trialing"
        ? ("default" as const)
        : ("secondary" as const);
};

type BillingCopy = ReturnType<
    typeof getDictionary
>["dictionary"]["apps"]["app"]["pages"]["common"]["account"]["billing"];

function CheckoutNotice({
    outcome,
    confirmed,
    billingCopy,
}: {
    outcome: string | null;
    confirmed: boolean;
    billingCopy: BillingCopy;
}) {
    if (outcome === "canceled") {
        return (
            <Alert>
                <AlertDescription>
                    {billingCopy.checkoutCanceled}
                </AlertDescription>
            </Alert>
        );
    }

    if (outcome !== "success") {
        return null;
    }

    return (
        <Alert>
            <AlertDescription>
                {confirmed
                    ? billingCopy.checkoutConfirmed
                    : billingCopy.checkoutPending}
            </AlertDescription>
        </Alert>
    );
}

type CurrentPlanCardProps = {
    subscription: SubscriptionStateDTO;
    plans: PlanDTO[];
    disabled: boolean;
    loading: boolean;
    onManage: () => void;
};

function CurrentPlanCard({
    subscription,
    plans,
    disabled,
    loading,
    onManage,
}: CurrentPlanCardProps) {
    const { dictionary, locale } = getDictionary();
    const billingCopy = dictionary.apps.app.pages.common.account.billing;

    const planName =
        plans.find((plan) => plan.priceId === subscription.priceId)?.name ??
        billingCopy.unknownPlan;
    const priceLabel = describePlanPrice(billingCopy, subscription, locale);
    const periodEnd = subscription.currentPeriodEnd
        ? formatPeriodEnd(subscription.currentPeriodEnd, locale)
        : null;
    const periodTemplate = subscription.cancelAtPeriodEnd
        ? billingCopy.endsOn
        : billingCopy.renewsOn;

    return (
        <Card>
            <CardHeader>
                <CardDescription>{billingCopy.currentPlan}</CardDescription>
                <CardTitle>{planName}</CardTitle>
                <CardAction>
                    <Badge variant={badgeVariantFor(subscription.status)}>
                        {billingCopy.status[subscription.status]}
                    </Badge>
                </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
                {priceLabel ? (
                    <p className="font-medium">{priceLabel}</p>
                ) : null}
                {periodEnd ? (
                    <p className="text-muted-foreground">
                        {periodTemplate.replace("{date}", periodEnd)}
                    </p>
                ) : null}
                {PAYMENT_ISSUE_STATUSES.includes(subscription.status) ? (
                    <p className="text-destructive">
                        {billingCopy.pastDueHint}
                    </p>
                ) : null}
            </CardContent>
            <CardFooter>
                <Button
                    disabled={disabled}
                    loading={loading}
                    onClick={onManage}
                    type="button"
                    variant="outline"
                >
                    {billingCopy.manage}
                </Button>
            </CardFooter>
        </Card>
    );
}

type PlanListProps = {
    plans: PlanDTO[];
    loadFailed: boolean;
    disabled: boolean;
    redirectingPriceId: string | null;
    onSubscribe: (priceId: string) => void;
};

function PlanList({
    plans,
    loadFailed,
    disabled,
    redirectingPriceId,
    onSubscribe,
}: PlanListProps) {
    const { dictionary } = getDictionary();
    const billingCopy = dictionary.apps.app.pages.common.account.billing;

    let emptyMessage: string | null = null;
    if (loadFailed) {
        emptyMessage = billingCopy.loadError;
    } else if (plans.length === 0) {
        emptyMessage = billingCopy.noPlans;
    }

    return (
        <section className="flex flex-col gap-3">
            <h3 className="font-medium text-sm">{billingCopy.plansTitle}</h3>
            {emptyMessage ? (
                <p className="text-muted-foreground text-sm">{emptyMessage}</p>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {plans.map((plan) => (
                        <BillingPlanCard
                            disabled={disabled}
                            key={plan.priceId}
                            loading={redirectingPriceId === plan.priceId}
                            onSubscribe={onSubscribe}
                            plan={plan}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

function BillingSkeleton() {
    return (
        <div className="flex w-full flex-col gap-4">
            <Skeleton className="h-4 w-64" />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Skeleton className="h-56 w-full" />
                <Skeleton className="h-56 w-full" />
            </div>
        </div>
    );
}

type AccountBillingPanelProps = {
    account: AccountDTO | undefined;
};

/**
 * The subscription comes from the account, never from Stripe, so the current plan still
 * shows when the catalog fails to load.
 */
export function AccountBillingPanel({ account }: AccountBillingPanelProps) {
    const { dictionary } = getDictionary();
    const billingCopy = dictionary.apps.app.pages.common.account.billing;
    const { isImpersonating } = useAuthRequestPanel();
    const searchParams = useSearchParams();
    const checkoutOutcome = searchParams.get("checkout");
    const { data: catalog, isError } = useListPlans();
    const { checkoutMutation, portalMutation } = usePaymentsMutations();

    const subscription = account?.subscription ?? null;
    const liveSubscription = isLive(subscription) ? subscription : null;

    // Back from a paid checkout, the subscription is only known once the webhook lands.
    // Until then a second checkout would open a second subscription and bill twice.
    const awaitingConfirmation =
        checkoutOutcome === "success" && liveSubscription === null;

    useCheckoutConfirmation(awaitingConfirmation);

    if (!(catalog || isError)) {
        return <BillingSkeleton />;
    }

    if (catalog && !catalog.enabled) {
        return <AccountBillingPlaceholder />;
    }

    // Success is followed by a full navigation to Stripe, so the buttons stay locked
    // until the page is gone instead of inviting a second click.
    const checkoutRedirecting =
        checkoutMutation.isPending || checkoutMutation.isSuccess;
    const portalRedirecting =
        portalMutation.isPending || portalMutation.isSuccess;
    const actionsDisabled =
        isImpersonating ||
        awaitingConfirmation ||
        checkoutRedirecting ||
        portalRedirecting;
    const plans = catalog?.plans ?? [];

    return (
        <div className="flex w-full flex-1 flex-col gap-6">
            <p className="text-muted-foreground text-sm">
                {billingCopy.description}
            </p>

            <CheckoutNotice
                billingCopy={billingCopy}
                confirmed={liveSubscription !== null}
                outcome={checkoutOutcome}
            />

            {liveSubscription ? (
                <CurrentPlanCard
                    disabled={actionsDisabled}
                    loading={portalRedirecting}
                    onManage={() => portalMutation.mutate()}
                    plans={plans}
                    subscription={liveSubscription}
                />
            ) : (
                <PlanList
                    disabled={actionsDisabled}
                    loadFailed={isError}
                    onSubscribe={(priceId) =>
                        checkoutMutation.mutate({ priceId })
                    }
                    plans={plans}
                    redirectingPriceId={
                        checkoutRedirecting
                            ? (checkoutMutation.variables?.priceId ?? null)
                            : null
                    }
                />
            )}
        </div>
    );
}
