/** biome-ignore-all lint/style/useFilenamingConvention: matches admin users colocated modules */
"use client";

import {
    HookFormDateInput,
    HookFormInput,
    HookFormRadioGroup,
    HookFormSelect,
    HookFormSwitch,
    HookFormTextarea,
} from "@repo/design-system/components/form/hookform";
import type { RadioOption } from "@repo/design-system/components/ui/radio-group-input";
import { getDictionary } from "@repo/internationalization/client";
import { EntityType } from "@repo/sdk/src/types";
import { useMemo } from "react";
import { formatDisplayDateTime } from "@/shared/lib/formatDisplayDateTime";
import {
    entityGenreUnset,
    entityGenreValues,
} from "../(validations)/entityFormSchema";

type EntityFormFieldsProps = {
    mode: "create" | "update";
    createdAtLabel?: string;
    createdAtValue?: string | null;
};

export function EntityFormFields({
    mode,
    createdAtLabel,
    createdAtValue,
}: EntityFormFieldsProps) {
    const { dictionary } = getDictionary();
    const entitiesForm = dictionary.apps.app.pages.common.entities.form;
    const entitiesList = dictionary.apps.app.pages.common.entities.list;

    const typeOptions = [
        {
            value: EntityType.FRANCHISE,
            label: entitiesList.typeLabels.franchise,
        },
        {
            value: EntityType.CUSTOMER,
            label: entitiesList.typeLabels.customer,
        },
        {
            value: EntityType.COLLABORATOR,
            label: entitiesList.typeLabels.collaborator,
        },
    ];

    const genreOptions = useMemo<RadioOption[]>(
        () => [
            {
                value: entityGenreUnset,
                label: entitiesForm.genreUnset,
            },
            ...entityGenreValues.map((g) => ({
                value: g,
                label: entitiesForm.genreOptions[g],
            })),
        ],
        [entitiesForm.genreOptions, entitiesForm.genreUnset]
    );

    return (
        <div className="contents">
            {mode === "update" && createdAtValue && createdAtLabel ? (
                <div className="col-span-1 md:col-span-2">
                    <p className="text-muted-foreground text-sm">
                        <span className="font-medium text-foreground">
                            {createdAtLabel}:{" "}
                        </span>
                        {formatDisplayDateTime(createdAtValue)}
                    </p>
                </div>
            ) : null}

            <div className="col-span-1 md:col-span-2">
                <HookFormInput
                    label={entitiesForm.name}
                    name="name"
                    placeholder={entitiesForm.name}
                    required
                    type="text"
                />
            </div>

            <div className="col-span-1 md:col-span-2">
                <HookFormTextarea
                    label={entitiesForm.description}
                    name="description"
                    rows={4}
                />
            </div>

            <div className="col-span-1 md:col-span-2">
                <HookFormSelect
                    label={entitiesForm.type}
                    name="type"
                    options={typeOptions}
                    placeholder={entitiesForm.type}
                    required
                    searchable={false}
                />
            </div>

            <div className="col-span-1 md:col-span-2">
                <HookFormInput
                    label={entitiesForm.photo}
                    name="photo"
                    placeholder={entitiesForm.photoPlaceholder}
                    type="url"
                />
                <p className="mt-1 text-muted-foreground text-xs">
                    {entitiesForm.photoHint}
                </p>
            </div>

            <div className="col-span-1 md:col-span-2">
                <HookFormRadioGroup
                    label={entitiesForm.genre}
                    name="genre"
                    options={genreOptions}
                />
            </div>

            <div className="col-span-1 md:col-span-2">
                <HookFormDateInput
                    label={entitiesForm.birthdate}
                    name="birthdate"
                />
            </div>

            {mode === "update" ? (
                <div className="col-span-1 md:col-span-2">
                    <HookFormSwitch
                        description={entitiesForm.enabled}
                        label={entitiesForm.enabled}
                        name="enabled"
                    />
                </div>
            ) : null}
        </div>
    );
}
