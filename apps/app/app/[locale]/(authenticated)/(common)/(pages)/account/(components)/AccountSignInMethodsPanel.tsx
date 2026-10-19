"use client";

import useAuth from "@repo/auth/provider";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@repo/design-system/components/ui/alert-dialog";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { getDictionary } from "@repo/internationalization/client";
import type { AccountDTO } from "@repo/sdk/src/types";
import { useId } from "react";
import {
    GOOGLE_PROVIDER_ID,
    PASSWORD_PROVIDER_ID,
} from "@/shared/lib/signInMethods";
import { useAuthRequestPanel } from "@/shared/providers/AuthRequestPanelContext";
import { useSignInMethodMutations } from "../(hooks)/useSignInMethodMutations";

const KNOWN_PROVIDER_IDS = [PASSWORD_PROVIDER_ID, GOOGLE_PROVIDER_ID];

type AccountSignInMethodsPanelProps = {
    account: AccountDTO | undefined;
};

type SignInMethodRow = {
    providerId: string;
    label: string;
    linked: boolean;
    email: string | null;
};

export function AccountSignInMethodsPanel({
    account,
}: AccountSignInMethodsPanelProps) {
    const titleId = useId();
    const { dictionary } = getDictionary();
    const { isImpersonating } = useAuthRequestPanel();
    const { signOut } = useAuth();
    const { linkGoogleMutation, unlinkMutation } = useSignInMethodMutations();
    const methodsCopy =
        dictionary.apps.app.pages.common.account.security.signInMethods;

    const providers = account?.providerData ?? [];
    const linkedCount = providers.length;
    const isMutating = linkGoogleMutation.isPending || unlinkMutation.isPending;
    const actionsDisabled = isImpersonating || isMutating;

    const labelOf = (providerId: string) => {
        if (providerId === PASSWORD_PROVIDER_ID) {
            return methodsCopy.methods.password;
        }
        if (providerId === GOOGLE_PROVIDER_ID) {
            return methodsCopy.methods.google;
        }
        return providerId;
    };

    const warningOf = (providerId: string) => {
        if (providerId === PASSWORD_PROVIDER_ID) {
            return methodsCopy.unlinkDialog.passwordWarning;
        }
        if (providerId === GOOGLE_PROVIDER_ID) {
            return methodsCopy.unlinkDialog.googleWarning;
        }
        return methodsCopy.unlinkDialog.otherWarning;
    };

    const unlink = (providerId: string) =>
        unlinkMutation.mutate(providerId, {
            onSuccess: () => {
                if (providerId === PASSWORD_PROVIDER_ID) {
                    signOut.mutate();
                }
            },
        });

    const rows: SignInMethodRow[] = account?.providerData
        ? [
              ...KNOWN_PROVIDER_IDS,
              ...providers
                  .map((provider) => provider.providerId)
                  .filter((id) => !KNOWN_PROVIDER_IDS.includes(id)),
          ].map((providerId) => {
              const provider = providers.find(
                  (candidate) => candidate.providerId === providerId
              );
              return {
                  providerId,
                  label: labelOf(providerId),
                  linked: Boolean(provider),
                  email:
                      providerId === PASSWORD_PROVIDER_ID
                          ? null
                          : (provider?.email ?? null),
              };
          })
        : [];

    return (
        <section
            aria-labelledby={titleId}
            className="flex flex-col gap-3 rounded-lg border border-border p-4"
        >
            <div className="flex flex-col gap-1">
                <h3 className="font-medium text-sm" id={titleId}>
                    {methodsCopy.title}
                </h3>
                <p className="text-muted-foreground text-sm">
                    {methodsCopy.description}
                </p>
            </div>
            <ul className="flex flex-col divide-y divide-border">
                {rows.map((row) => {
                    const isLastMethod = row.linked && linkedCount <= 1;
                    const unlinkLabel = methodsCopy.unlinkAriaLabel.replace(
                        "{method}",
                        row.label
                    );
                    return (
                        <li
                            className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                            key={row.providerId}
                        >
                            <div className="flex min-w-0 flex-col gap-1">
                                <span className="flex flex-wrap items-center gap-2 font-medium text-sm">
                                    {row.label}
                                    {row.linked ? (
                                        <Badge variant="secondary">
                                            {methodsCopy.linked}
                                        </Badge>
                                    ) : (
                                        <span className="font-normal text-muted-foreground text-xs">
                                            {methodsCopy.notLinked}
                                        </span>
                                    )}
                                </span>
                                {row.email ? (
                                    <span className="break-all text-muted-foreground text-xs">
                                        {row.email}
                                    </span>
                                ) : null}
                                {isLastMethod ? (
                                    <span className="text-muted-foreground text-xs">
                                        {methodsCopy.lastMethodHint}
                                    </span>
                                ) : null}
                            </div>
                            {row.linked ? (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            aria-label={unlinkLabel}
                                            className="self-start sm:self-center"
                                            disabled={
                                                actionsDisabled || isLastMethod
                                            }
                                            loading={
                                                unlinkMutation.isPending &&
                                                unlinkMutation.variables ===
                                                    row.providerId
                                            }
                                            size="sm"
                                            type="button"
                                            variant="outline"
                                        >
                                            {methodsCopy.unlink}
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>
                                                {methodsCopy.unlinkDialog.title.replace(
                                                    "{method}",
                                                    row.label
                                                )}
                                            </AlertDialogTitle>
                                            <AlertDialogDescription>
                                                {warningOf(row.providerId)}
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>
                                                {
                                                    methodsCopy.unlinkDialog
                                                        .cancel
                                                }
                                            </AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() =>
                                                    unlink(row.providerId)
                                                }
                                            >
                                                {
                                                    methodsCopy.unlinkDialog
                                                        .confirm
                                                }
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            ) : null}
                            {!row.linked &&
                            row.providerId === GOOGLE_PROVIDER_ID ? (
                                <Button
                                    className="self-start sm:self-center"
                                    disabled={actionsDisabled}
                                    loading={linkGoogleMutation.isPending}
                                    onClick={() => linkGoogleMutation.mutate()}
                                    size="sm"
                                    type="button"
                                    variant="outline"
                                >
                                    {methodsCopy.linkGoogle}
                                </Button>
                            ) : null}
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
