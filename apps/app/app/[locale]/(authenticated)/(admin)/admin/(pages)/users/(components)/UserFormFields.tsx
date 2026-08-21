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
};

export function UserFormFields({ mode }: UserFormFieldsProps) {
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

    return (
        <div className="contents">
            <div className="col-span-1 md:col-span-2">
                <HookFormInput
                    disabled={mode === "update"}
                    label={adminUsers.form.email}
                    name="email"
                    placeholder={adminUsers.form.email}
                    required={mode === "create"}
                    type="email"
                />
                <HookFormInputPassword
                    hidden={mode === "update"}
                    label={adminUsers.form.password}
                    name="password"
                    required
                    type="password"
                />
                <HookFormInputPassword
                    hidden={mode === "update"}
                    label={adminUsers.form.confirmPassword}
                    name="confirmPassword"
                    required
                    type="password"
                />
                <HookFormInput
                    hidden={mode === "create"}
                    label={adminUsers.form.displayName}
                    name="displayName"
                    placeholder={adminUsers.form.displayName}
                    type="text"
                />
            </div>

            <div className="col-span-1 md:col-span-2">
                <HookFormSelect
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
