"use client";

import { Table } from "@repo/design-system/components/ui";
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
import type { AccountSessionDTO } from "@repo/sdk/src/types";
import FormattedError from "@repo/shared/utils/helpers/formattedError";
import { handleClientError } from "@repo/shared/utils/helpers/handleClientError";
import { useFormatDisplayDateTime } from "@/shared/lib/formatDisplayDateTime";
import { useAuthRequestPanel } from "@/shared/providers/AuthRequestPanelContext";
import { useAccountSessionMutations } from "../(hooks)/useAccountSessionMutations";
import { useListAccountSessions } from "../(hooks)/useListAccountSessions";

export function AccountSessionsPanel() {
    const { dictionary, locale } = getDictionary();
    const { isImpersonating } = useAuthRequestPanel();
    const formatDateTime = useFormatDisplayDateTime();
    const {
        data: sessions,
        isLoading,
        isFetching,
        error: listError,
        refetch,
    } = useListAccountSessions();
    const { revokeSessionMutation, revokeOtherSessionsMutation } =
        useAccountSessionMutations();
    const accountSecurity = dictionary.apps.app.pages.common.account.security;
    const sessionsCopy = accountSecurity.sessions;

    const listLoadError = listError
        ? handleClientError(new FormattedError(listError, locale))
        : null;
    const isMutating =
        revokeSessionMutation.isPending ||
        revokeOtherSessionsMutation.isPending;
    const hasOtherSessions = (sessions ?? []).some(
        (session) => !session.current
    );

    const deviceLabel = (session: AccountSessionDTO) =>
        [session.browser, session.os].filter(Boolean).join(" · ") ||
        sessionsCopy.unknownDevice;

    const columns = [
        {
            title: sessionsCopy.columns.device,
            dataIndex: "browser",
            render: (_value: string | null, session: AccountSessionDTO) => (
                <div className="flex flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-2 font-medium">
                        {deviceLabel(session)}
                        {session.current ? (
                            <Badge variant="secondary">
                                {sessionsCopy.current}
                            </Badge>
                        ) : null}
                    </span>
                    {session.deviceType ? (
                        <span className="text-muted-foreground text-xs">
                            {sessionsCopy.deviceTypes[session.deviceType]}
                        </span>
                    ) : null}
                </div>
            ),
        },
        {
            title: sessionsCopy.columns.signedInAt,
            dataIndex: "signedInAt",
            render: (value: string) => formatDateTime(value),
        },
        {
            title: sessionsCopy.columns.lastSeenAt,
            dataIndex: "lastSeenAt",
            render: (value: string) => formatDateTime(value),
        },
        {
            title: sessionsCopy.columns.actions,
            dataIndex: "id",
            render: (id: string, session: AccountSessionDTO) =>
                session.current ? null : (
                    <Button
                        aria-label={sessionsCopy.revokeAriaLabel.replace(
                            "{device}",
                            deviceLabel(session)
                        )}
                        disabled={isImpersonating || isMutating}
                        loading={
                            revokeSessionMutation.isPending &&
                            revokeSessionMutation.variables === id
                        }
                        onClick={() => revokeSessionMutation.mutate(id)}
                        size="sm"
                        type="button"
                        variant="outline"
                    >
                        {sessionsCopy.revoke}
                    </Button>
                ),
        },
    ];

    return (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <div className="flex flex-col gap-1">
                <span className="font-medium text-sm">
                    {sessionsCopy.title}
                </span>
                <p className="text-muted-foreground text-sm">
                    {sessionsCopy.description}
                </p>
            </div>
            <Table<AccountSessionDTO>
                columns={columns}
                dataSource={listLoadError ? [] : sessions}
                loading={isLoading}
                locale={{ emptyText: listLoadError ?? sessionsCopy.empty }}
                onRefresh={() => refetch()}
                pagination={false}
                refreshLoading={isFetching}
                rowKey={(row) => row.id}
            />
            <div className="flex flex-col gap-2">
                <p className="text-muted-foreground text-sm">
                    {sessionsCopy.revokeOthersDescription}
                </p>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button
                            className="self-start"
                            disabled={
                                isImpersonating ||
                                isMutating ||
                                !hasOtherSessions
                            }
                            loading={revokeOtherSessionsMutation.isPending}
                            type="button"
                            variant="outline"
                        >
                            {sessionsCopy.revokeOthers}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                {sessionsCopy.revokeOthers}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                {sessionsCopy.revokeOthersConfirm}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>
                                {accountSecurity.cancel}
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() =>
                                    revokeOtherSessionsMutation.mutate()
                                }
                            >
                                {sessionsCopy.revokeOthersAction}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
}
