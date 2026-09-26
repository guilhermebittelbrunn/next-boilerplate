export const sharedUtilsTranslations = {
    "pt-br": {
        error: {
            unexpected: "Um erro inesperado aconteceu",
            requestIdLabel: "Código do erro",
        },
        apiErrors: {
            AUTH_MISSING_BEARER: "Token de autenticação ausente.",
            AUTH_INVALID_TOKEN: "Sessão inválida ou expirada.",
            ADMIN_FORBIDDEN: "Você não tem permissão para esta ação.",
            AUTH_REQUEST_USER_ID_MISMATCH: "Contexto da requisição inválido.",
            AUTH_REQUEST_USER_ROLE_MISMATCH: "Contexto da requisição inválido.",
            AUTH_REQUEST_PANEL_FORBIDDEN:
                "Painel não permitido para este usuário.",
            AUTH_REQUEST_IMPERSONATION_FORBIDDEN:
                "Não é possível atuar como outro usuário.",
            AUTH_REQUEST_ADMIN_TARGET_INVALID:
                "Contexto da requisição inválido.",
            AUTH_REQUEST_IMPERSONATION_REQUIRED:
                "Selecione um usuário para este painel.",
            AUTH_REQUEST_IMPERSONATION_TARGET_INVALID:
                "Usuário inválido para atuação.",
            AUTH_REQUEST_IMPERSONATION_READ_ONLY:
                "Somente leitura: você está atuando como outro usuário.",
            AUTH_MISSING_TOKEN: "Token de autenticação ausente.",
            AUTH_FORBIDDEN_ORIGIN: "Origem da requisição não permitida.",
            AUTH_NO_SESSION: "Nenhuma sessão ativa.",
            AUTH_SESSION_EXPIRED:
                "Sua sessão atingiu o tempo máximo. Entre novamente.",
            USERS_NOT_FOUND: "Usuário não encontrado.",
            USERS_DELETE_BILLING_FAILED:
                "Não foi possível cancelar a assinatura deste usuário, então ele não foi arquivado. Tente de novo em instantes.",
            ACCOUNT_NOTHING_TO_UPDATE: "Nada para atualizar.",
            ACCOUNT_AVATAR_INVALID:
                "A imagem informada não pode ser usada como foto de perfil.",
            ACCOUNT_CURRENT_PASSWORD_INVALID: "A senha atual está incorreta.",
            ACCOUNT_PASSWORD_UNSUPPORTED:
                "Esta conta não usa senha. Entre pelo provedor de acesso original.",
            ACCOUNT_UPDATE_FAILED:
                "Não foi possível salvar a sua conta. Tente de novo.",
            ACCOUNT_SESSIONS_REVOKE_FAILED:
                "Não foi possível encerrar as sessões. Tente de novo.",
            ACCOUNT_EXPORT_IMPERSONATION_FORBIDDEN:
                "Não é possível exportar os dados enquanto você atua como outro usuário.",
            ACCOUNT_EXPORT_FAILED:
                "Não foi possível gerar o arquivo com os seus dados. Tente de novo.",
            ACCOUNT_DELETION_CONFIRMATION_INVALID:
                "Informe a sua senha atual para confirmar a exclusão.",
            ACCOUNT_DELETION_REAUTH_UNSUPPORTED:
                "Esta conta não tem senha para confirmar a exclusão. Use o canal de privacidade.",
            ACCOUNT_DELETION_FAILED:
                "Não foi possível concluir a exclusão da conta. Tente de novo.",
            ACCOUNT_DELETION_BILLING_FAILED:
                "Não conseguimos cancelar a sua assinatura, então a conta não foi excluída. Tente de novo em instantes.",
            PAYMENTS_NOT_CONFIGURED:
                "A cobrança não está disponível neste ambiente.",
            PAYMENTS_PLAN_NOT_FOUND: "Este plano não está mais disponível.",
            PAYMENTS_SUBSCRIPTION_ALREADY_ACTIVE:
                "Você já tem uma assinatura ativa. Use Gerenciar assinatura para trocar de plano.",
            PAYMENTS_CUSTOMER_NOT_FOUND:
                "Não há assinatura para gerenciar nesta conta.",
            PAYMENTS_PROVIDER_UNAVAILABLE:
                "O serviço de pagamento não respondeu. Tente de novo em instantes.",
            ONBOARDING_STEP_NOT_SKIPPABLE: "Este passo não pode ser pulado.",
            ONBOARDING_STEP_OUT_OF_ORDER:
                "Seu progresso mudou em outra aba. Atualizamos para o passo certo.",
            ONBOARDING_UPDATE_FAILED:
                "Não foi possível salvar seu progresso. Tente de novo.",
            USERS_NOTHING_TO_UPDATE: "Nenhum dado para atualizar.",
            VALIDATION_FAILED: "Dados inválidos.",
            USERS_AUTH_EMAIL_ALREADY_IN_USE: "Este e-mail já está em uso.",
            USERS_AUTH_WEAK_PASSWORD: "Senha muito fraca.",
            AUTH_PASSWORD_TOO_SHORT:
                "A senha deve ter pelo menos 8 caracteres.",
            USERS_AUTH_INVALID_EMAIL: "E-mail inválido.",
            USERS_AUTH_RATE_LIMITED:
                "Muitas tentativas. Tente novamente em instantes.",
            USERS_AUTH_SIGN_UP_FAILED: "Não foi possível criar o usuário.",
            USERS_PROFILE_CREATE_FAILED:
                "Não foi possível salvar o perfil do usuário.",
            COMMON_PANEL_FORBIDDEN:
                "Esta ação não está disponível para o seu perfil.",
            ENTITY_NOT_FOUND: "Entidade não encontrada.",
            ENTITY_CREATE_FAILED:
                "Não foi possível concluir o cadastro da entidade.",
            AUTH_RATE_LIMITED:
                "Muitas tentativas em pouco tempo. Aguarde um instante e tente de novo.",
            EMAIL_NOT_CONFIGURED:
                "O envio de e-mails não está configurado. Fale com o suporte.",
            EMAIL_SEND_FAILED:
                "Não foi possível enviar o e-mail agora. Tente de novo em instantes.",
            AUTH_OOB_CODE_INVALID: "Este link não é válido. Peça um novo.",
            AUTH_OOB_CODE_EXPIRED: "Este link expirou. Peça um novo.",
            AUTH_PASSWORD_RESET_FAILED:
                "Não foi possível redefinir a senha. Peça um novo link.",
            AUTH_EMAIL_VERIFICATION_FAILED:
                "Não foi possível confirmar o e-mail. Peça um novo link.",
            STORAGE_NOT_CONFIGURED:
                "O envio de arquivos não está configurado. Fale com o suporte.",
            UPLOAD_FILE_MISSING: "Nenhum arquivo foi enviado.",
            UPLOAD_FILE_TOO_LARGE: "O arquivo excede o tamanho máximo de 4 MB.",
            UPLOAD_FILE_TYPE_NOT_ALLOWED:
                "Formato não aceito. Envie JPG, PNG ou WebP.",
            UPLOAD_FAILED:
                "Não foi possível enviar o arquivo agora. Tente de novo em instantes.",
            ENTITY_PHOTO_INVALID: "Imagem inválida para esta entidade.",
            HEALTH_DEPENDENCY_UNAVAILABLE:
                "O serviço está indisponível no momento.",
            PAGINATION_CURSOR_INVALID:
                "A navegação expirou. Recarregue a lista.",
            PAGINATION_INDEX_MISSING:
                "A listagem está indisponível no momento. Tente de novo em instantes.",
            SUMMARY_INDEX_MISSING:
                "O resumo está indisponível no momento. Tente de novo em instantes.",
        },
    },
    en: {
        error: {
            unexpected: "An unexpected error occurred",
            requestIdLabel: "Error code",
        },
        apiErrors: {
            AUTH_MISSING_BEARER: "Missing authentication token.",
            AUTH_INVALID_TOKEN: "Invalid or expired session.",
            ADMIN_FORBIDDEN: "You do not have permission for this action.",
            AUTH_REQUEST_USER_ID_MISMATCH: "Invalid request context.",
            AUTH_REQUEST_USER_ROLE_MISMATCH: "Invalid request context.",
            AUTH_REQUEST_PANEL_FORBIDDEN:
                "This panel is not allowed for your account.",
            AUTH_REQUEST_IMPERSONATION_FORBIDDEN:
                "You cannot act as another user.",
            AUTH_REQUEST_ADMIN_TARGET_INVALID: "Invalid request context.",
            AUTH_REQUEST_IMPERSONATION_REQUIRED:
                "Select a user for this panel.",
            AUTH_REQUEST_IMPERSONATION_TARGET_INVALID:
                "Invalid user for impersonation.",
            AUTH_REQUEST_IMPERSONATION_READ_ONLY:
                "Read-only: you are acting as another user.",
            AUTH_MISSING_TOKEN: "Missing authentication token.",
            AUTH_FORBIDDEN_ORIGIN: "Request origin not allowed.",
            AUTH_NO_SESSION: "No active session.",
            AUTH_SESSION_EXPIRED:
                "Your session reached its maximum lifetime. Sign in again.",
            USERS_NOT_FOUND: "User not found.",
            USERS_DELETE_BILLING_FAILED:
                "We couldn't cancel this user's subscription, so they were not archived. Try again in a moment.",
            ACCOUNT_NOTHING_TO_UPDATE: "Nothing to update.",
            ACCOUNT_AVATAR_INVALID:
                "That image cannot be used as your profile picture.",
            ACCOUNT_CURRENT_PASSWORD_INVALID: "The current password is wrong.",
            ACCOUNT_PASSWORD_UNSUPPORTED:
                "This account does not use a password. Sign in with your original provider.",
            ACCOUNT_UPDATE_FAILED:
                "Your account could not be saved. Try again.",
            ACCOUNT_SESSIONS_REVOKE_FAILED:
                "The sessions could not be ended. Try again.",
            ACCOUNT_EXPORT_IMPERSONATION_FORBIDDEN:
                "Data cannot be exported while you are acting as another user.",
            ACCOUNT_EXPORT_FAILED:
                "Your data file could not be generated. Try again.",
            ACCOUNT_DELETION_CONFIRMATION_INVALID:
                "Enter your current password to confirm the deletion.",
            ACCOUNT_DELETION_REAUTH_UNSUPPORTED:
                "This account has no password to confirm the deletion. Use the privacy channel.",
            ACCOUNT_DELETION_FAILED:
                "The account deletion could not be completed. Try again.",
            ACCOUNT_DELETION_BILLING_FAILED:
                "We couldn't cancel your subscription, so the account was not deleted. Try again in a moment.",
            PAYMENTS_NOT_CONFIGURED:
                "Billing is not available in this environment.",
            PAYMENTS_PLAN_NOT_FOUND: "This plan is no longer available.",
            PAYMENTS_SUBSCRIPTION_ALREADY_ACTIVE:
                "You already have an active subscription. Use Manage subscription to change plans.",
            PAYMENTS_CUSTOMER_NOT_FOUND:
                "There is no subscription to manage on this account.",
            PAYMENTS_PROVIDER_UNAVAILABLE:
                "The payment service did not respond. Try again in a moment.",
            ONBOARDING_STEP_NOT_SKIPPABLE: "This step cannot be skipped.",
            ONBOARDING_STEP_OUT_OF_ORDER:
                "Your progress changed in another tab. We moved you to the right step.",
            ONBOARDING_UPDATE_FAILED:
                "Your progress could not be saved. Try again.",
            USERS_NOTHING_TO_UPDATE: "Nothing to update.",
            VALIDATION_FAILED: "Invalid data.",
            USERS_AUTH_EMAIL_ALREADY_IN_USE: "This email is already in use.",
            USERS_AUTH_WEAK_PASSWORD: "Password is too weak.",
            AUTH_PASSWORD_TOO_SHORT:
                "The password must have at least 8 characters.",
            USERS_AUTH_INVALID_EMAIL: "Invalid email.",
            USERS_AUTH_RATE_LIMITED: "Too many attempts. Try again shortly.",
            USERS_AUTH_SIGN_UP_FAILED: "Could not create the user.",
            USERS_PROFILE_CREATE_FAILED: "Could not save the user profile.",
            COMMON_PANEL_FORBIDDEN:
                "This action is not available for your account.",
            ENTITY_NOT_FOUND: "Entity not found.",
            ENTITY_CREATE_FAILED: "Could not finish creating the entity.",
            AUTH_RATE_LIMITED:
                "Too many attempts in a short time. Wait a moment and try again.",
            EMAIL_NOT_CONFIGURED:
                "Email delivery is not configured. Contact support.",
            EMAIL_SEND_FAILED:
                "The email could not be sent right now. Try again shortly.",
            AUTH_OOB_CODE_INVALID: "This link is not valid. Request a new one.",
            AUTH_OOB_CODE_EXPIRED: "This link has expired. Request a new one.",
            AUTH_PASSWORD_RESET_FAILED:
                "Could not reset the password. Request a new link.",
            AUTH_EMAIL_VERIFICATION_FAILED:
                "Could not confirm the email. Request a new link.",
            STORAGE_NOT_CONFIGURED:
                "File uploads are not configured. Contact support.",
            UPLOAD_FILE_MISSING: "No file was sent.",
            UPLOAD_FILE_TOO_LARGE: "The file exceeds the 4 MB limit.",
            UPLOAD_FILE_TYPE_NOT_ALLOWED:
                "Format not accepted. Send JPG, PNG or WebP.",
            UPLOAD_FAILED:
                "Could not upload the file right now. Try again shortly.",
            ENTITY_PHOTO_INVALID: "Invalid image for this record.",
            HEALTH_DEPENDENCY_UNAVAILABLE:
                "The service is unavailable right now.",
            PAGINATION_CURSOR_INVALID:
                "This page reference expired. Reload the list.",
            PAGINATION_INDEX_MISSING:
                "The listing is unavailable right now. Try again shortly.",
            SUMMARY_INDEX_MISSING:
                "The summary is unavailable right now. Try again shortly.",
        },
    },
    es: {
        error: {
            unexpected: "Ocurrió un error inesperado",
            requestIdLabel: "Código del error",
        },
        apiErrors: {
            AUTH_MISSING_BEARER: "Falta el token de autenticación.",
            AUTH_INVALID_TOKEN: "Sesión inválida o expirada.",
            ADMIN_FORBIDDEN: "No tienes permiso para esta acción.",
            AUTH_REQUEST_USER_ID_MISMATCH: "Contexto de solicitud no válido.",
            AUTH_REQUEST_USER_ROLE_MISMATCH: "Contexto de solicitud no válido.",
            AUTH_REQUEST_PANEL_FORBIDDEN:
                "Este panel no está permitido para tu cuenta.",
            AUTH_REQUEST_IMPERSONATION_FORBIDDEN:
                "No puedes actuar como otro usuario.",
            AUTH_REQUEST_ADMIN_TARGET_INVALID:
                "Contexto de solicitud no válido.",
            AUTH_REQUEST_IMPERSONATION_REQUIRED:
                "Selecciona un usuario para este panel.",
            AUTH_REQUEST_IMPERSONATION_TARGET_INVALID:
                "Usuario no válido para la suplantación.",
            AUTH_REQUEST_IMPERSONATION_READ_ONLY:
                "Solo lectura: estás actuando como otro usuario.",
            AUTH_MISSING_TOKEN: "Falta el token de autenticación.",
            AUTH_FORBIDDEN_ORIGIN: "Origen de la solicitud no permitido.",
            AUTH_NO_SESSION: "No hay sesión activa.",
            AUTH_SESSION_EXPIRED:
                "Tu sesión alcanzó el tiempo máximo. Inicia sesión de nuevo.",
            USERS_NOT_FOUND: "Usuario no encontrado.",
            USERS_DELETE_BILLING_FAILED:
                "No pudimos cancelar la suscripción de este usuario, así que no se archivó. Inténtalo de nuevo en unos instantes.",
            ACCOUNT_NOTHING_TO_UPDATE: "Nada para actualizar.",
            ACCOUNT_AVATAR_INVALID:
                "Esa imagen no se puede usar como foto de perfil.",
            ACCOUNT_CURRENT_PASSWORD_INVALID:
                "La contraseña actual es incorrecta.",
            ACCOUNT_PASSWORD_UNSUPPORTED:
                "Esta cuenta no usa contraseña. Entra con tu proveedor de acceso original.",
            ACCOUNT_UPDATE_FAILED:
                "No se pudo guardar tu cuenta. Inténtalo de nuevo.",
            ACCOUNT_SESSIONS_REVOKE_FAILED:
                "No se pudieron cerrar las sesiones. Inténtalo de nuevo.",
            ACCOUNT_EXPORT_IMPERSONATION_FORBIDDEN:
                "No se pueden exportar los datos mientras actúas como otro usuario.",
            ACCOUNT_EXPORT_FAILED:
                "No se pudo generar el archivo con tus datos. Inténtalo de nuevo.",
            ACCOUNT_DELETION_CONFIRMATION_INVALID:
                "Indica tu contraseña actual para confirmar la eliminación.",
            ACCOUNT_DELETION_REAUTH_UNSUPPORTED:
                "Esta cuenta no tiene contraseña para confirmar la eliminación. Usa el canal de privacidad.",
            ACCOUNT_DELETION_FAILED:
                "No se pudo completar la eliminación de la cuenta. Inténtalo de nuevo.",
            ACCOUNT_DELETION_BILLING_FAILED:
                "No pudimos cancelar tu suscripción, así que la cuenta no se eliminó. Inténtalo de nuevo en unos instantes.",
            PAYMENTS_NOT_CONFIGURED:
                "La facturación no está disponible en este entorno.",
            PAYMENTS_PLAN_NOT_FOUND: "Este plan ya no está disponible.",
            PAYMENTS_SUBSCRIPTION_ALREADY_ACTIVE:
                "Ya tienes una suscripción activa. Usa Gestionar suscripción para cambiar de plan.",
            PAYMENTS_CUSTOMER_NOT_FOUND:
                "No hay ninguna suscripción que gestionar en esta cuenta.",
            PAYMENTS_PROVIDER_UNAVAILABLE:
                "El servicio de pago no respondió. Inténtalo de nuevo en unos instantes.",
            ONBOARDING_STEP_NOT_SKIPPABLE: "Este paso no se puede omitir.",
            ONBOARDING_STEP_OUT_OF_ORDER:
                "Tu progreso cambió en otra pestaña. Te llevamos al paso correcto.",
            ONBOARDING_UPDATE_FAILED:
                "No se pudo guardar tu progreso. Inténtalo de nuevo.",
            USERS_NOTHING_TO_UPDATE: "No hay datos para actualizar.",
            VALIDATION_FAILED: "Datos no válidos.",
            USERS_AUTH_EMAIL_ALREADY_IN_USE: "Este correo ya está en uso.",
            USERS_AUTH_WEAK_PASSWORD: "La contraseña es demasiado débil.",
            AUTH_PASSWORD_TOO_SHORT:
                "La contraseña debe tener al menos 8 caracteres.",
            USERS_AUTH_INVALID_EMAIL: "Correo no válido.",
            USERS_AUTH_RATE_LIMITED:
                "Demasiados intentos. Inténtalo de nuevo en unos momentos.",
            USERS_AUTH_SIGN_UP_FAILED: "No se pudo crear el usuario.",
            USERS_PROFILE_CREATE_FAILED:
                "No se pudo guardar el perfil del usuario.",
            COMMON_PANEL_FORBIDDEN:
                "Esta acción no está disponible para tu cuenta.",
            ENTITY_NOT_FOUND: "Entidad no encontrada.",
            ENTITY_CREATE_FAILED:
                "No se pudo completar el registro de la entidad.",
            AUTH_RATE_LIMITED:
                "Demasiados intentos en poco tiempo. Espere un momento e inténtelo de nuevo.",
            EMAIL_NOT_CONFIGURED:
                "El envío de correos no está configurado. Contacta al soporte.",
            EMAIL_SEND_FAILED:
                "No se pudo enviar el correo ahora. Inténtalo de nuevo en unos momentos.",
            AUTH_OOB_CODE_INVALID:
                "Este enlace no es válido. Solicita uno nuevo.",
            AUTH_OOB_CODE_EXPIRED:
                "Este enlace ha caducado. Solicita uno nuevo.",
            AUTH_PASSWORD_RESET_FAILED:
                "No se pudo restablecer la contraseña. Solicita un enlace nuevo.",
            AUTH_EMAIL_VERIFICATION_FAILED:
                "No se pudo confirmar el correo. Solicita un enlace nuevo.",
            STORAGE_NOT_CONFIGURED:
                "La subida de archivos no está configurada. Contacta al soporte.",
            UPLOAD_FILE_MISSING: "No se envió ningún archivo.",
            UPLOAD_FILE_TOO_LARGE: "El archivo supera el límite de 4 MB.",
            UPLOAD_FILE_TYPE_NOT_ALLOWED:
                "Formato no aceptado. Envía JPG, PNG o WebP.",
            UPLOAD_FAILED:
                "No se pudo subir el archivo ahora. Inténtalo en unos instantes.",
            ENTITY_PHOTO_INVALID: "Imagen no válida para este registro.",
            HEALTH_DEPENDENCY_UNAVAILABLE:
                "El servicio no está disponible en este momento.",
            PAGINATION_CURSOR_INVALID:
                "La navegación expiró. Vuelve a cargar la lista.",
            PAGINATION_INDEX_MISSING:
                "El listado no está disponible ahora. Inténtalo de nuevo en unos instantes.",
            SUMMARY_INDEX_MISSING:
                "El resumen no está disponible ahora. Inténtalo de nuevo en unos instantes.",
        },
    },
};
