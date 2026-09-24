import { CONSENT_COOKIE_NAME, parseConsent } from "@repo/analytics/consent";
import useAuth from "@repo/auth/provider";
import useAlert from "@repo/design-system/hooks/useAlert";
import { getDictionary } from "@repo/internationalization/client";
import type {
    AccountDataExportDTO,
    DeleteAccountRequest,
} from "@repo/sdk/src/types";
import { getCookie } from "@repo/shared/utils";
import FormattedError from "@repo/shared/utils/helpers/formattedError";
import { handleClientError } from "@repo/shared/utils/helpers/handleClientError";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/client";
import {
    buildExportFileName,
    downloadJsonFile,
} from "@/shared/lib/downloadJsonFile";

/**
 * The consent choice lives in a browser cookie and the server keeps no copy, so the file
 * carries it as what it is: the decision as this browser holds it.
 */
function readCookieConsent() {
    return {
        source: "browser-cookie",
        cookieName: CONSENT_COOKIE_NAME,
        decision: parseConsent(getCookie(CONSENT_COOKIE_NAME)),
    };
}

function saveExportFile(payload: AccountDataExportDTO): void {
    downloadJsonFile(buildExportFileName(payload.format.name, new Date()), {
        ...payload,
        cookieConsent: readCookieConsent(),
    });
}

/**
 * Both actions are mutations, the export included: it is rate limited, audited and
 * produces a file, so a query would fire it on its own and keep the whole dossier in
 * memory afterwards.
 */
export const useAccountDataRights = () => {
    const { successAlert, errorAlert } = useAlert();
    const { dictionary, locale } = getDictionary();
    const { signOut } = useAuth();
    const accountMessages = dictionary.apps.app.pages.common.account.messages;

    const formatClientError = (error: unknown) =>
        handleClientError(new FormattedError(error, locale));

    const exportDataMutation = useMutation({
        mutationFn: () => apiClient.account.exportData(),
        onSuccess: (payload) => {
            saveExportFile(payload);
            successAlert(accountMessages.dataExported);
        },
        onError: (error) => errorAlert(formatClientError(error)),
    });

    const deleteAccountMutation = useMutation({
        mutationFn: (body: DeleteAccountRequest) =>
            apiClient.account.deleteAccount(body),
        onSuccess: () => {
            successAlert(accountMessages.accountDeleted);
            // The account no longer exists, so the local session is already dead: signing
            // out is what clears the cookie and the cache the browser still holds.
            signOut.mutate();
        },
        onError: (error) => errorAlert(formatClientError(error)),
    });

    return { exportDataMutation, deleteAccountMutation };
};
