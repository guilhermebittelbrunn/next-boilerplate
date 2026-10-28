export const sharedUtilsTranslations = {
    "pt-br": {
        error: {
            unexpected: "Um erro inesperado aconteceu",
            requestIdLabel: "Código do erro",
        },
        apiErrors: {
            AUTH_MISSING_BEARER: "Token de autenticação ausente.",
            AUTH_INVALID_TOKEN: "Sessão inválida ou expirada.",
            AUTH_INVALID_CREDENTIALS: "E-mail ou senha incorretos.",
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
            USERS_DELETE_AUTH_FAILED:
                "Não foi possível bloquear o acesso deste usuário, então ele não foi arquivado. Tente de novo em instantes.",
            USERS_DELETE_ORGANIZATION_HAS_MEMBERS:
                "Este usuário é dono de uma equipe que ainda tem membros, então ele não foi arquivado. Antes, ele precisa transferir a propriedade a um dos membros, ou os membros precisam sair ou ser removidos.",
            USERS_SELF_LOCKOUT_FORBIDDEN:
                "Você não pode desativar, arquivar nem tirar o acesso de administrador da sua própria conta.",
            ACCOUNT_NOTHING_TO_UPDATE: "Nada para atualizar.",
            ACCOUNT_AVATAR_INVALID:
                "A imagem informada não pode ser usada como foto de perfil.",
            ACCOUNT_CURRENT_PASSWORD_INVALID: "A senha atual está incorreta.",
            ACCOUNT_PASSWORD_UNSUPPORTED:
                "Esta conta não usa senha. Entre pelo provedor de acesso original.",
            ACCOUNT_PASSWORD_ALREADY_SET:
                "Esta conta já tem senha. Use a troca de senha.",
            ACCOUNT_REAUTH_INVALID:
                "Não conseguimos confirmar a sua conta Google. Tente de novo.",
            ACCOUNT_SIGN_IN_METHOD_NOT_FOUND:
                "Este método de login não está vinculado à conta.",
            ACCOUNT_SIGN_IN_METHOD_LAST:
                "Não é possível remover o único método de login da conta.",
            ACCOUNT_UPDATE_FAILED:
                "Não foi possível salvar a sua conta. Tente de novo.",
            ACCOUNT_SESSIONS_REVOKE_FAILED:
                "Não foi possível encerrar as sessões. Tente de novo.",
            AUTH_SESSION_REVOKED:
                "Esta sessão foi encerrada. Entre novamente para continuar.",
            ACCOUNT_SESSION_NOT_FOUND:
                "Sessão não encontrada. Atualize a lista e tente de novo.",
            ACCOUNT_SESSION_IS_CURRENT:
                "Esta é a sessão que você está usando. Para encerrá-la, use Sair.",
            ACCOUNT_SESSION_UNIDENTIFIED:
                "Não foi possível identificar esta sessão. Entre novamente e tente de novo.",
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
            ACCOUNT_DELETION_ORGANIZATION_HAS_MEMBERS:
                "A sua equipe ainda tem membros. Transfira a propriedade a um deles ou remova-os antes de excluir a conta.",
            ORGANIZATION_FORBIDDEN: "Só o dono da equipe pode fazer isso.",
            PAYMENTS_NOT_CONFIGURED:
                "A cobrança não está disponível neste ambiente.",
            PAYMENTS_PLAN_NOT_FOUND: "Este plano não está mais disponível.",
            PAYMENTS_SUBSCRIPTION_ALREADY_ACTIVE:
                "Você já tem uma assinatura ativa. Use Gerenciar assinatura para trocar de plano.",
            PAYMENTS_CUSTOMER_NOT_FOUND:
                "Não há assinatura para gerenciar nesta conta.",
            PAYMENTS_PROVIDER_UNAVAILABLE:
                "O serviço de pagamento não respondeu. Tente de novo em instantes.",
            PAYMENTS_WEBHOOK_HANDLER_FAILED:
                "Não foi possível processar o evento de pagamento.",
            PLAN_SUBSCRIPTION_REQUIRED: "Esta ação exige uma assinatura ativa.",
            PLAN_FEATURE_REQUIRED: "O seu plano não inclui este recurso.",
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
            CONTACT_UNAVAILABLE:
                "O canal de contato não está disponível no momento.",
            AUTH_OOB_CODE_INVALID: "Este link não é válido. Peça um novo.",
            AUTH_OOB_CODE_EXPIRED: "Este link expirou. Peça um novo.",
            AUTH_EMAIL_LINK_DISABLED: "Entrar por link não está disponível.",
            AUTH_PASSWORD_RESET_FAILED:
                "Não foi possível redefinir a senha. Peça um novo link.",
            AUTH_EMAIL_VERIFICATION_FAILED:
                "Não foi possível confirmar o e-mail. Peça um novo link.",
            AUTH_EMAIL_CHANGE_FAILED:
                "Não foi possível trocar o e-mail. Peça a troca de novo.",
            ACCOUNT_EMAIL_UNCHANGED: "O novo e-mail é igual ao atual.",
            ACCOUNT_EMAIL_CHANGE_REAUTH_UNSUPPORTED:
                "Esta conta não tem senha para confirmar a troca de e-mail.",
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
            NOTIFICATION_NOT_FOUND: "Notificação não encontrada.",
            NOTIFICATIONS_INDEX_MISSING:
                "As notificações estão indisponíveis no momento. Tente de novo em instantes.",
            ORGANIZATION_MEMBERS_DISABLED:
                "Equipes não estão disponíveis neste ambiente.",
            ORGANIZATION_MEMBER_NOT_FOUND:
                "Esta pessoa não faz parte da equipe.",
            ORGANIZATION_OWNERSHIP_TARGET_SELF: "Você já é o dono da equipe.",
            ORGANIZATION_OWNERSHIP_TARGET_ARCHIVED:
                "Esta conta foi desativada e não pode receber a propriedade da equipe.",
            ORGANIZATION_OWNER_CANNOT_LEAVE:
                "O dono não pode sair nem ser removido da equipe. Para sair, transfira antes a propriedade a outro membro.",
            ORGANIZATION_INVITATION_NOT_FOUND: "Convite não encontrado.",
            ORGANIZATION_INVITATION_ALREADY_MEMBER:
                "Esta pessoa já faz parte da equipe.",
            ORGANIZATION_INVITATION_LIMIT_REACHED:
                "A equipe chegou ao limite de convites pendentes. Revogue algum antes de convidar outra pessoa.",
            ORGANIZATION_INVITATION_RECENTLY_SENT:
                "Um convite acabou de ser enviado para este e-mail. Aguarde um minuto para reenviar.",
            ORGANIZATION_INVITATION_INVALID:
                "Este convite não vale mais. Peça um novo a quem convidou você.",
            ORGANIZATION_INVITATION_EXPIRED:
                "Este convite expirou. Peça um novo a quem convidou você.",
            ORGANIZATION_INVITATION_EMAIL_MISMATCH:
                "Este convite foi enviado para outro e-mail. Entre com a conta desse e-mail para aceitar.",
            ORGANIZATION_INVITATION_OWNER_HAS_MEMBERS:
                "Você é dono de uma equipe com membros. Transfira a propriedade a um deles ou remova-os antes de entrar em outra equipe.",
            ORGANIZATION_INVITATION_FAILED:
                "Não foi possível enviar o convite agora. Tente de novo em instantes.",
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
            AUTH_INVALID_CREDENTIALS: "Incorrect email or password.",
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
            USERS_DELETE_AUTH_FAILED:
                "We couldn't block this user's access, so they were not archived. Try again in a moment.",
            USERS_DELETE_ORGANIZATION_HAS_MEMBERS:
                "This user owns a team that still has members, so they were not archived. First they must hand ownership to one of the members, or the members must leave or be removed.",
            USERS_SELF_LOCKOUT_FORBIDDEN:
                "You can't disable, archive or remove admin access from your own account.",
            ACCOUNT_NOTHING_TO_UPDATE: "Nothing to update.",
            ACCOUNT_AVATAR_INVALID:
                "That image cannot be used as your profile picture.",
            ACCOUNT_CURRENT_PASSWORD_INVALID: "The current password is wrong.",
            ACCOUNT_PASSWORD_UNSUPPORTED:
                "This account does not use a password. Sign in with your original provider.",
            ACCOUNT_PASSWORD_ALREADY_SET:
                "This account already has a password. Use the password change instead.",
            ACCOUNT_REAUTH_INVALID:
                "We could not confirm your Google account. Try again.",
            ACCOUNT_SIGN_IN_METHOD_NOT_FOUND:
                "This sign-in method is not linked to the account.",
            ACCOUNT_SIGN_IN_METHOD_LAST:
                "The account's only sign-in method cannot be removed.",
            ACCOUNT_UPDATE_FAILED:
                "Your account could not be saved. Try again.",
            ACCOUNT_SESSIONS_REVOKE_FAILED:
                "The sessions could not be ended. Try again.",
            AUTH_SESSION_REVOKED:
                "This session was ended. Sign in again to continue.",
            ACCOUNT_SESSION_NOT_FOUND:
                "Session not found. Refresh the list and try again.",
            ACCOUNT_SESSION_IS_CURRENT:
                "This is the session you are using. Use Sign out to end it.",
            ACCOUNT_SESSION_UNIDENTIFIED:
                "This session could not be identified. Sign in again and retry.",
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
            ACCOUNT_DELETION_ORGANIZATION_HAS_MEMBERS:
                "Your team still has members. Hand ownership to one of them or remove them before deleting your account.",
            ORGANIZATION_FORBIDDEN: "Only the team owner can do this.",
            PAYMENTS_NOT_CONFIGURED:
                "Billing is not available in this environment.",
            PAYMENTS_PLAN_NOT_FOUND: "This plan is no longer available.",
            PAYMENTS_SUBSCRIPTION_ALREADY_ACTIVE:
                "You already have an active subscription. Use Manage subscription to change plans.",
            PAYMENTS_CUSTOMER_NOT_FOUND:
                "There is no subscription to manage on this account.",
            PAYMENTS_PROVIDER_UNAVAILABLE:
                "The payment service did not respond. Try again in a moment.",
            PAYMENTS_WEBHOOK_HANDLER_FAILED:
                "The payment event could not be processed.",
            PLAN_SUBSCRIPTION_REQUIRED:
                "This action requires an active subscription.",
            PLAN_FEATURE_REQUIRED: "Your plan does not include this feature.",
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
            CONTACT_UNAVAILABLE:
                "The contact channel is not available right now.",
            AUTH_OOB_CODE_INVALID: "This link is not valid. Request a new one.",
            AUTH_OOB_CODE_EXPIRED: "This link has expired. Request a new one.",
            AUTH_EMAIL_LINK_DISABLED: "Sign-in by email link is not available.",
            AUTH_PASSWORD_RESET_FAILED:
                "Could not reset the password. Request a new link.",
            AUTH_EMAIL_VERIFICATION_FAILED:
                "Could not confirm the email. Request a new link.",
            AUTH_EMAIL_CHANGE_FAILED:
                "Could not change the email. Request the change again.",
            ACCOUNT_EMAIL_UNCHANGED:
                "The new email is the same as the current one.",
            ACCOUNT_EMAIL_CHANGE_REAUTH_UNSUPPORTED:
                "This account has no password to confirm the email change.",
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
            NOTIFICATION_NOT_FOUND: "Notification not found.",
            NOTIFICATIONS_INDEX_MISSING:
                "Notifications are unavailable right now. Try again shortly.",
            ORGANIZATION_MEMBERS_DISABLED:
                "Teams are not available in this environment.",
            ORGANIZATION_MEMBER_NOT_FOUND:
                "This person is not part of the team.",
            ORGANIZATION_OWNERSHIP_TARGET_SELF: "You already own the team.",
            ORGANIZATION_OWNERSHIP_TARGET_ARCHIVED:
                "This account was deactivated and cannot receive team ownership.",
            ORGANIZATION_OWNER_CANNOT_LEAVE:
                "The owner cannot leave or be removed from the team. To leave, hand ownership to another member first.",
            ORGANIZATION_INVITATION_NOT_FOUND: "Invitation not found.",
            ORGANIZATION_INVITATION_ALREADY_MEMBER:
                "This person is already part of the team.",
            ORGANIZATION_INVITATION_LIMIT_REACHED:
                "The team reached the limit of pending invitations. Revoke one before inviting someone else.",
            ORGANIZATION_INVITATION_RECENTLY_SENT:
                "An invitation was just sent to this email. Wait a minute to resend it.",
            ORGANIZATION_INVITATION_INVALID:
                "This invitation is no longer valid. Ask whoever invited you for a new one.",
            ORGANIZATION_INVITATION_EXPIRED:
                "This invitation has expired. Ask whoever invited you for a new one.",
            ORGANIZATION_INVITATION_EMAIL_MISMATCH:
                "This invitation was sent to another email. Sign in with that account to accept it.",
            ORGANIZATION_INVITATION_OWNER_HAS_MEMBERS:
                "You own a team that has members. Hand ownership to one of them or remove them before joining another team.",
            ORGANIZATION_INVITATION_FAILED:
                "We couldn't send the invitation right now. Try again in a moment.",
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
            AUTH_INVALID_CREDENTIALS:
                "Correo electrónico o contraseña incorrectos.",
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
            USERS_DELETE_AUTH_FAILED:
                "No pudimos bloquear el acceso de este usuario, así que no se archivó. Inténtalo de nuevo en unos instantes.",
            USERS_DELETE_ORGANIZATION_HAS_MEMBERS:
                "Este usuario es dueño de un equipo que todavía tiene miembros, así que no se archivó. Antes, debe transferir la propiedad a uno de los miembros, o los miembros deben salir o ser quitados del equipo.",
            USERS_SELF_LOCKOUT_FORBIDDEN:
                "No puedes desactivar, archivar ni quitar el acceso de administrador de tu propia cuenta.",
            ACCOUNT_NOTHING_TO_UPDATE: "Nada para actualizar.",
            ACCOUNT_AVATAR_INVALID:
                "Esa imagen no se puede usar como foto de perfil.",
            ACCOUNT_CURRENT_PASSWORD_INVALID:
                "La contraseña actual es incorrecta.",
            ACCOUNT_PASSWORD_UNSUPPORTED:
                "Esta cuenta no usa contraseña. Entra con tu proveedor de acceso original.",
            ACCOUNT_PASSWORD_ALREADY_SET:
                "Esta cuenta ya tiene contraseña. Usa el cambio de contraseña.",
            ACCOUNT_REAUTH_INVALID:
                "No pudimos confirmar tu cuenta de Google. Inténtalo de nuevo.",
            ACCOUNT_SIGN_IN_METHOD_NOT_FOUND:
                "Este método de inicio de sesión no está vinculado a la cuenta.",
            ACCOUNT_SIGN_IN_METHOD_LAST:
                "No se puede quitar el único método de inicio de sesión de la cuenta.",
            ACCOUNT_UPDATE_FAILED:
                "No se pudo guardar tu cuenta. Inténtalo de nuevo.",
            ACCOUNT_SESSIONS_REVOKE_FAILED:
                "No se pudieron cerrar las sesiones. Inténtalo de nuevo.",
            AUTH_SESSION_REVOKED:
                "Esta sesión fue cerrada. Inicia sesión de nuevo para continuar.",
            ACCOUNT_SESSION_NOT_FOUND:
                "Sesión no encontrada. Actualiza la lista e inténtalo de nuevo.",
            ACCOUNT_SESSION_IS_CURRENT:
                "Esta es la sesión que estás usando. Para cerrarla, usa Salir.",
            ACCOUNT_SESSION_UNIDENTIFIED:
                "No se pudo identificar esta sesión. Inicia sesión de nuevo e inténtalo otra vez.",
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
            ACCOUNT_DELETION_ORGANIZATION_HAS_MEMBERS:
                "Tu equipo todavía tiene miembros. Transfiere la propiedad a uno de ellos o quítalos antes de eliminar tu cuenta.",
            ORGANIZATION_FORBIDDEN:
                "Solo el dueño del equipo puede hacer esto.",
            PAYMENTS_NOT_CONFIGURED:
                "La facturación no está disponible en este entorno.",
            PAYMENTS_PLAN_NOT_FOUND: "Este plan ya no está disponible.",
            PAYMENTS_SUBSCRIPTION_ALREADY_ACTIVE:
                "Ya tienes una suscripción activa. Usa Gestionar suscripción para cambiar de plan.",
            PAYMENTS_CUSTOMER_NOT_FOUND:
                "No hay ninguna suscripción que gestionar en esta cuenta.",
            PAYMENTS_PROVIDER_UNAVAILABLE:
                "El servicio de pago no respondió. Inténtalo de nuevo en unos instantes.",
            PAYMENTS_WEBHOOK_HANDLER_FAILED:
                "No se pudo procesar el evento de pago.",
            PLAN_SUBSCRIPTION_REQUIRED:
                "Esta acción requiere una suscripción activa.",
            PLAN_FEATURE_REQUIRED: "Tu plan no incluye esta función.",
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
            CONTACT_UNAVAILABLE:
                "El canal de contacto no está disponible en este momento.",
            AUTH_OOB_CODE_INVALID:
                "Este enlace no es válido. Solicita uno nuevo.",
            AUTH_OOB_CODE_EXPIRED:
                "Este enlace ha caducado. Solicita uno nuevo.",
            AUTH_EMAIL_LINK_DISABLED:
                "El acceso por enlace no está disponible.",
            AUTH_PASSWORD_RESET_FAILED:
                "No se pudo restablecer la contraseña. Solicita un enlace nuevo.",
            AUTH_EMAIL_VERIFICATION_FAILED:
                "No se pudo confirmar el correo. Solicita un enlace nuevo.",
            AUTH_EMAIL_CHANGE_FAILED:
                "No se pudo cambiar el correo. Solicita el cambio de nuevo.",
            ACCOUNT_EMAIL_UNCHANGED: "El nuevo correo es igual al actual.",
            ACCOUNT_EMAIL_CHANGE_REAUTH_UNSUPPORTED:
                "Esta cuenta no tiene contraseña para confirmar el cambio de correo.",
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
            NOTIFICATION_NOT_FOUND: "Notificación no encontrada.",
            NOTIFICATIONS_INDEX_MISSING:
                "Las notificaciones no están disponibles ahora. Inténtalo de nuevo en unos instantes.",
            ORGANIZATION_MEMBERS_DISABLED:
                "Los equipos no están disponibles en este entorno.",
            ORGANIZATION_MEMBER_NOT_FOUND:
                "Esta persona no forma parte del equipo.",
            ORGANIZATION_OWNERSHIP_TARGET_SELF: "Ya eres el dueño del equipo.",
            ORGANIZATION_OWNERSHIP_TARGET_ARCHIVED:
                "Esta cuenta fue desactivada y no puede recibir la propiedad del equipo.",
            ORGANIZATION_OWNER_CANNOT_LEAVE:
                "El dueño no puede salir ni ser quitado del equipo. Para salir, transfiere antes la propiedad a otro miembro.",
            ORGANIZATION_INVITATION_NOT_FOUND: "Invitación no encontrada.",
            ORGANIZATION_INVITATION_ALREADY_MEMBER:
                "Esta persona ya forma parte del equipo.",
            ORGANIZATION_INVITATION_LIMIT_REACHED:
                "El equipo llegó al límite de invitaciones pendientes. Revoca alguna antes de invitar a otra persona.",
            ORGANIZATION_INVITATION_RECENTLY_SENT:
                "Se acaba de enviar una invitación a este correo. Espera un minuto para reenviarla.",
            ORGANIZATION_INVITATION_INVALID:
                "Esta invitación ya no es válida. Pide una nueva a quien te invitó.",
            ORGANIZATION_INVITATION_EXPIRED:
                "Esta invitación venció. Pide una nueva a quien te invitó.",
            ORGANIZATION_INVITATION_EMAIL_MISMATCH:
                "Esta invitación se envió a otro correo. Inicia sesión con esa cuenta para aceptarla.",
            ORGANIZATION_INVITATION_OWNER_HAS_MEMBERS:
                "Eres dueño de un equipo con miembros. Transfiere la propiedad a uno de ellos o quítalos antes de unirte a otro equipo.",
            ORGANIZATION_INVITATION_FAILED:
                "No pudimos enviar la invitación ahora. Inténtalo de nuevo en unos instantes.",
        },
    },
};
