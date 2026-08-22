"use client";

import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@repo/design-system/components/ui/alert";
import { getDictionary } from "@repo/internationalization/client";
import { EyeIcon } from "lucide-react";
import { useAuthRequestPanel } from "@/shared/providers/AuthRequestPanelContext";

const REFERENCE_ID_PREVIEW_LENGTH = 8;

/**
 * Explains why the mutating controls of a screen are unavailable while an admin acts as
 * another user. A disabled control is not announced by screen readers, so the explanation
 * has to be a live region of its own rather than a hint attached to the control.
 */
export function ImpersonationReadOnlyNotice() {
    const { dictionary } = getDictionary();
    const { isImpersonating, impersonatedLabel, impersonatedFirebaseUid } =
        useAuthRequestPanel();

    if (!isImpersonating) {
        return null;
    }

    const readOnlyCopy = dictionary.apps.app.pages.impersonation.readOnly;
    const actingAsLabel = dictionary.apps.app.pages.navbar.actingAsUserLabel;
    // The display name lives in localStorage and only arrives after mount, so the uid
    // stands in until then — and permanently when storage is unavailable.
    const subject =
        impersonatedLabel ??
        impersonatedFirebaseUid?.slice(0, REFERENCE_ID_PREVIEW_LENGTH) ??
        "";

    return (
        <Alert>
            <EyeIcon />
            <AlertTitle>{readOnlyCopy.title}</AlertTitle>
            <AlertDescription>
                <p>{readOnlyCopy.description}</p>
                <p>
                    {`${actingAsLabel}: `}
                    <strong className="font-medium text-foreground">
                        {subject}
                    </strong>
                </p>
            </AlertDescription>
        </Alert>
    );
}
