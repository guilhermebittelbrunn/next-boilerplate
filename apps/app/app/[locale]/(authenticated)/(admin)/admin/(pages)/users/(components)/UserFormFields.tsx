"use client";

import {
    HookFormInput,
    HookFormInputPassword,
    HookFormSelect,
} from "@repo/design-system/components/form/hookform";
import { getDictionary } from "@repo/internationalization/client";
import { UserType } from "@repo/sdk/src/types";

type UserFormFieldsProps = {
    mode: "create" | "update";
    lockType?: boolean;
};

export function UserFormFields({
    mode,
    lockType = false,
}: UserFormFieldsProps) {
    const { dictionary } = getDictionary();
    const adminUsers = dictionary.apps.app.pages.admin.users;

    const typeOptions = [
        {
            value: UserType.COMMON,
            label: adminUsers.list.typeLabels.common,
        },
        {
            value: UserType.ADMIN,
            label: adminUsers.list.typeLabels.admin,
        },
    ];

    const isCreate = mode === "create";

    return (
        <div className="contents">
            <div className="col-span-1 md:col-span-2">
                <HookFormInput
                    autoComplete="off"
                    disabled={!isCreate}
                    label={adminUsers.form.email}
                    name="email"
                    placeholder={adminUsers.form.email}
                    required={isCreate}
                    spellCheck={false}
                    type="email"
                />
            </div>

            {isCreate ? (
                <>
                    <div className="col-span-1">
                        <HookFormInputPassword
                            autoComplete="new-password"
                            label={adminUsers.form.password}
                            name="password"
                            required
                            type="password"
                        />
                    </div>
                    <div className="col-span-1">
                        <HookFormInputPassword
                            autoComplete="new-password"
                            label={adminUsers.form.confirmPassword}
                            name="confirmPassword"
                            required
                            type="password"
                        />
                    </div>
                </>
            ) : (
                <div className="col-span-1">
                    <HookFormInput
                        autoComplete="off"
                        label={adminUsers.form.displayName}
                        name="displayName"
                        placeholder={adminUsers.form.displayName}
                        type="text"
                    />
                </div>
            )}

            <div className="col-span-1">
                <HookFormSelect
                    description={
                        lockType ? adminUsers.form.typeSelfLocked : undefined
                    }
                    disabled={lockType}
                    label={adminUsers.form.type}
                    name="type"
                    options={typeOptions}
                    placeholder={adminUsers.form.type}
                    required
                    searchable={false}
                />
            </div>
        </div>
    );
}
