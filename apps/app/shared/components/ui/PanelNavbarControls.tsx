"use client";

import { canSwitchPanelEnvironment, UserRoleLevel } from "@repo/auth/types";
import { Select } from "@repo/design-system/components/ui";
import { Button } from "@repo/design-system/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
import { useIsMobile } from "@repo/design-system/hooks/useMobile";
import { getDictionaryForLocale } from "@repo/internationalization/client";
import { UserType, type UserWithAuthDTO } from "@repo/sdk/src/types";
import { ChevronDownIcon, ShieldCheckIcon, UserIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import { useListUsers } from "@/shared/hooks/useListUsers";
import { useAuthRequestPanel } from "@/shared/providers/AuthRequestPanelContext";

const REFERENCE_ID_PREVIEW_LENGTH = 8;

export default function PanelNavbarControls() {
    const isMobile = useIsMobile();
    const params = useParams();
    const locale = typeof params.locale === "string" ? params.locale : "pt-br";
    const { dictionary } = getDictionaryForLocale(locale);
    const navbarCopy = dictionary.apps.app.pages.navbar;

    const {
        profileKind,
        panelRequestRole,
        impersonatedFirebaseUid,
        impersonatedLabel,
        setPanelEnvironment,
        setImpersonatedUser,
    } = useAuthRequestPanel();

    const canSwitchEnvironment =
        profileKind === "admin" &&
        canSwitchPanelEnvironment(UserRoleLevel.ADMIN);
    const showImpersonationSelect =
        profileKind === "admin" && panelRequestRole === UserRoleLevel.COMMON;

    const environmentOptions = useMemo(
        () => [
            {
                value: UserRoleLevel.ADMIN,
                label: navbarCopy.environmentAdmin,
                icon: <ShieldCheckIcon className="size-4" />,
            },
            {
                value: UserRoleLevel.COMMON,
                label: navbarCopy.environmentCommon,
                icon: <UserIcon className="size-4" />,
            },
        ],
        [navbarCopy.environmentAdmin, navbarCopy.environmentCommon]
    );

    const { data: commonUsers, isLoading: loadingCommonUsers } = useListUsers({
        enabled: canSwitchEnvironment,
        type: UserType.COMMON,
    });

    const impersonationOptions = useMemo(() => {
        if (!commonUsers) {
            return [];
        }

        const uniqueUsersByReferenceId = new Map<string, UserWithAuthDTO>();

        for (const user of commonUsers) {
            if (!uniqueUsersByReferenceId.has(user.reference_id)) {
                uniqueUsersByReferenceId.set(user.reference_id, user);
            }
        }

        return Array.from(uniqueUsersByReferenceId.values()).map((user) => ({
            value: user.reference_id,
            label:
                user.displayName?.trim() ||
                user.email?.trim() ||
                user.reference_id.slice(0, REFERENCE_ID_PREVIEW_LENGTH),
        }));
    }, [commonUsers]);

    // Show the persisted choice (id + label) immediately, before the user list
    // finishes loading; merge with the loaded options once available.
    const selectOptions = useMemo(() => {
        if (
            impersonatedFirebaseUid &&
            impersonatedLabel &&
            !impersonationOptions.some(
                (option) => option.value === impersonatedFirebaseUid
            )
        ) {
            return [
                { value: impersonatedFirebaseUid, label: impersonatedLabel },
                ...impersonationOptions,
            ];
        }
        return impersonationOptions;
    }, [impersonatedFirebaseUid, impersonatedLabel, impersonationOptions]);

    const labelForUid = useCallback(
        (uid: string | null) =>
            selectOptions.find((option) => option.value === uid)?.label ?? null,
        [selectOptions]
    );

    const resolveImpersonatedUserForCommonMode = useCallback(() => {
        if (impersonationOptions.length === 0) {
            // Keep the persisted choice until the list loads.
            return impersonatedFirebaseUid;
        }
        const hasSavedUserInCurrentOptions =
            impersonatedFirebaseUid &&
            impersonationOptions.some(
                (option) => option.value === impersonatedFirebaseUid
            );
        if (hasSavedUserInCurrentOptions) {
            return impersonatedFirebaseUid;
        }
        return impersonationOptions[0].value;
    }, [impersonatedFirebaseUid, impersonationOptions]);

    const handleImpersonatedUserChange = useCallback(
        (value: string) => {
            setImpersonatedUser(value, labelForUid(value));
            window.location.reload();
        },
        [setImpersonatedUser, labelForUid]
    );

    const handleEnvironmentChange = useCallback(
        (value: string) => {
            const nextRole = value as UserRoleLevel;
            if (nextRole === UserRoleLevel.COMMON) {
                const nextImpersonatedUser =
                    resolveImpersonatedUserForCommonMode();
                setImpersonatedUser(
                    nextImpersonatedUser,
                    labelForUid(nextImpersonatedUser)
                );
            }
            // Switching to ADMIN clears impersonation inside setPanelEnvironment.
            setPanelEnvironment(nextRole);
        },
        [
            resolveImpersonatedUserForCommonMode,
            setImpersonatedUser,
            setPanelEnvironment,
            labelForUid,
        ]
    );

    // In the COMMON (impersonation) panel the select must never be empty: default
    // to the first available user as soon as the list is known.
    useEffect(() => {
        if (!showImpersonationSelect || impersonationOptions.length === 0) {
            return;
        }
        const hasValidSelection =
            impersonatedFirebaseUid &&
            impersonationOptions.some(
                (option) => option.value === impersonatedFirebaseUid
            );
        if (!hasValidSelection) {
            const first = impersonationOptions[0];
            setImpersonatedUser(first.value, first.label);
        }
    }, [
        showImpersonationSelect,
        impersonationOptions,
        impersonatedFirebaseUid,
        setImpersonatedUser,
    ]);

    if (!canSwitchEnvironment) {
        return null;
    }

    const currentEnvironmentOption =
        environmentOptions.find(
            (option) => option.value === panelRequestRole
        ) ?? environmentOptions[0];

    if (isMobile) {
        return (
            <div className="flex items-center gap-2 pl-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            className="h-9 max-w-full justify-between gap-2 bg-sidebar-border px-3"
                            type="button"
                            variant="ghost"
                        >
                            <span className="inline-flex min-w-0 items-center gap-2">
                                {currentEnvironmentOption?.icon}
                                <span className="truncate">
                                    {currentEnvironmentOption?.label}
                                </span>
                            </span>
                            <ChevronDownIcon className="size-4 opacity-60" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align="start"
                        className="w-[min(92vw,24rem)] p-3"
                    >
                        <DropdownMenuLabel className="px-0">
                            {navbarCopy.environmentLabel}
                        </DropdownMenuLabel>
                        <div className="mt-2">
                            <Select
                                onValueChange={handleEnvironmentChange}
                                options={environmentOptions}
                                searchable={false}
                                triggerClassName="w-full"
                                value={panelRequestRole}
                            />
                        </div>
                        {showImpersonationSelect ? (
                            <div className="mt-4">
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel className="px-0">
                                    {navbarCopy.selectUserPlaceholder}
                                </DropdownMenuLabel>
                                <div className="mt-2">
                                    <Select
                                        disabled={loadingCommonUsers}
                                        onValueChange={
                                            handleImpersonatedUserChange
                                        }
                                        options={selectOptions}
                                        placeholder={
                                            navbarCopy.selectUserPlaceholder
                                        }
                                        triggerClassName="w-full"
                                        value={
                                            impersonatedFirebaseUid ?? undefined
                                        }
                                    />
                                </div>
                            </div>
                        ) : null}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        );
    }

    return (
        <div className="flex flex-wrap items-center gap-3 pl-2">
            <div>
                <Select
                    onValueChange={handleEnvironmentChange}
                    options={environmentOptions}
                    searchable={false}
                    value={panelRequestRole}
                />
            </div>

            <div>
                {showImpersonationSelect ? (
                    <Select
                        disabled={loadingCommonUsers}
                        onValueChange={handleImpersonatedUserChange}
                        options={selectOptions}
                        placeholder={navbarCopy.selectUserPlaceholder}
                        value={impersonatedFirebaseUid ?? undefined}
                    />
                ) : null}
            </div>
        </div>
    );
}
