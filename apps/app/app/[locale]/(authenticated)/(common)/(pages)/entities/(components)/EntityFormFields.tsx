"use client";

import {
    HookFormDateInput,
    HookFormImageUpload,
    HookFormInput,
    HookFormRadioGroup,
    HookFormSelect,
    HookFormSwitch,
    HookFormTextarea,
} from "@repo/design-system/components/form/hookform";
import type { RadioOption } from "@repo/design-system/components/ui/radio-group-input";
import { cn } from "@repo/design-system/lib/utils";
import { getDictionary } from "@repo/internationalization/client";
import { EntityType } from "@repo/sdk/src/types";
import { type ReactNode, useMemo } from "react";
import { useFormatDisplayDateTime } from "@/shared/lib/formatDisplayDateTime";
import { isStorageEnabled } from "@/shared/lib/storageEnabled";
import {
    entityGenreUnset,
    entityGenreValues,
} from "../(validations)/entityFormSchema";

type UploadPhotoHandler = (
    file: File,
    onProgress: (percent: number) => void
) => Promise<{ path: string; url: string }>;

type EntityFormFieldsProps = {
    mode: "create" | "update";
    createdAtLabel?: string;
    createdAtValue?: string | null;
    /** Displayable URL of the stored reference; the field itself keeps the reference. */
    photoPreviewUrl?: string | null;
    uploadPhoto?: UploadPhotoHandler;
};

function FieldGroupTitle({
    children,
    first = false,
}: {
    children: ReactNode;
    first?: boolean;
}) {
    return (
        <h2
            className={cn(
                "col-span-1 font-semibold text-sm tracking-tight md:col-span-2",
                !first && "mt-1 border-border border-t pt-6"
            )}
        >
            {children}
        </h2>
    );
}

export function EntityFormFields({
    mode,
    createdAtLabel,
    createdAtValue,
    photoPreviewUrl,
    uploadPhoto,
}: EntityFormFieldsProps) {
    const { dictionary } = getDictionary();
    const formatDateTime = useFormatDisplayDateTime();
    const entitiesForm = dictionary.apps.app.pages.common.entities.form;
    const entitiesList = dictionary.apps.app.pages.common.entities.list;
    const canUploadPhoto = Boolean(uploadPhoto) && isStorageEnabled();

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
                <p className="col-span-1 text-muted-foreground text-sm tabular-nums md:col-span-2">
                    {createdAtLabel}: {formatDateTime(createdAtValue)}
                </p>
            ) : null}

            <FieldGroupTitle first>
                {entitiesForm.sections.identity}
            </FieldGroupTitle>

            <div className="col-span-1">
                <HookFormInput
                    autoComplete="off"
                    label={entitiesForm.name}
                    name="name"
                    placeholder={entitiesForm.name}
                    required
                    type="text"
                />
            </div>

            <div className="col-span-1">
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
                <HookFormTextarea
                    label={entitiesForm.description}
                    name="description"
                    rows={4}
                />
            </div>

            <div className="col-span-1 md:col-span-2">
                {canUploadPhoto && uploadPhoto ? (
                    <HookFormImageUpload
                        label={entitiesForm.photoUpload.label}
                        name="photo"
                        previewSrc={photoPreviewUrl}
                        texts={entitiesForm.photoUpload}
                        upload={uploadPhoto}
                    />
                ) : (
                    <div className="flex flex-col gap-2">
                        <HookFormInput
                            label={entitiesForm.photo}
                            name="photo"
                            placeholder={entitiesForm.photoPlaceholder}
                            type="url"
                        />
                        <p className="text-muted-foreground text-xs">
                            {entitiesForm.photoHint}
                        </p>
                    </div>
                )}
            </div>

            <FieldGroupTitle>{entitiesForm.sections.profile}</FieldGroupTitle>

            <div className="col-span-1">
                <HookFormRadioGroup
                    label={entitiesForm.genre}
                    name="genre"
                    options={genreOptions}
                />
            </div>

            <div className="col-span-1">
                <HookFormDateInput
                    captionLayout="dropdown"
                    label={entitiesForm.birthdate}
                    name="birthdate"
                />
            </div>

            {mode === "update" ? (
                <>
                    <FieldGroupTitle>
                        {entitiesForm.sections.status}
                    </FieldGroupTitle>
                    <div className="col-span-1 md:col-span-2">
                        <HookFormSwitch
                            description={entitiesForm.enabled}
                            label={entitiesForm.enabled}
                            name="enabled"
                        />
                    </div>
                </>
            ) : null}
        </div>
    );
}
