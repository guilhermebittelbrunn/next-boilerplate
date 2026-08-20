"use client";

import { UserRoleLevel } from "@repo/auth/types";
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
import {
    shouldRenderImpersonationPicker,
    shouldRenderPanelControls,
} from "@/shared/lib/panelState";
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

    // Pure, snapshot-driven: the server seeds the panel state, so these are already
    // correct on the first paint and never flip while a request is in flight.
    const canSwitchEnvironment = shouldRenderPanelControls(profileKind);
    const showImpersonationSelect = shouldRenderImpersonationPicker(
        profileKind,
        panelRequestRole
    );

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

    /**
     * The saved choice when it is still a valid option, otherwise the first common user.
     * Business rule: the impersonation picker is never empty.
     */
    const resolveImpersonationTarget = useCallback(() => {
        const savedOption = impersonationOptions.find(
            (option) => option.value === impersonatedFirebaseUid
        );
        const target = savedOption ?? impersonationOptions[0];
        return target ? { uid: target.value, label: target.label } : null;
    }, [impersonatedFirebaseUid, impersonationOptions]);

    const handleImpersonatedUserChange = useCallback(
        (value: string) => {
            // `setImpersonatedUser` updates the cookies and calls `router.refresh()`, so
            // the Server Components re-run with the new subject without a full reload.
            setImpersonatedUser(value, labelForUid(value));
        },
        [setImpersonatedUser, labelForUid]
    );

    const handleEnvironmentChange = useCallback(
        (value: string) => {
            const nextRole = value as UserRoleLevel;
            setPanelEnvironment(
                nextRole,
                nextRole === UserRoleLevel.COMMON
                    ? (resolveImpersonationTarget() ?? undefined)
                    : undefined
            );
        },
        [resolveImpersonationTarget, setPanelEnvironment]
    );

    // The picker must never be empty in the common panel: as soon as the list is known,
    // fall back to the first user. `setImpersonatedUser` refreshes the Server Components
    // so the server resolves the same subject the client just picked.
    useEffect(() => {
        if (!showImpersonationSelect || impersonationOptions.length === 0) {
            return;
        }
        const hasValidSelection = impersonationOptions.some(
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

    // Entering the common panel requires a target, so block the switch while the list is
    // in flight or empty — otherwise the click is a silent no-op.
    const environmentDisabled =
        loadingCommonUsers ||
        (panelRequestRole === UserRoleLevel.ADMIN &&
            impersonationOptions.length === 0);

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
                                disabled={environmentDisabled}
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

    // Fixed widths, never content-driven: the trigger defaults to `w-fit`, so a long
    // display name used to stretch the navbar until the layout broke on narrow viewports
    // with the sidebar open. The value line-clamps inside the fixed box, and the open list
    // truncates each option with the full name on hover.
    return (
        <div className="flex min-w-0 items-center gap-2 pl-2">
            <Select
                disabled={environmentDisabled}
                onValueChange={handleEnvironmentChange}
                options={environmentOptions}
                searchable={false}
                triggerClassName="w-[11rem] shrink-0"
                value={panelRequestRole}
            />

            {showImpersonationSelect ? (
                <Select
                    disabled={loadingCommonUsers}
                    onValueChange={handleImpersonatedUserChange}
                    options={selectOptions}
                    placeholder={navbarCopy.selectUserPlaceholder}
                    triggerClassName="w-[15rem] max-w-[45vw]"
                    value={impersonatedFirebaseUid ?? undefined}
                />
            ) : null}
        </div>
    );
}
