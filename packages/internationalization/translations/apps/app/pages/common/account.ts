export const commonAccountPageTranslations = {
    "pt-br": {
        title: "Minha conta",
        subtitle: "Gerencie seus dados, sua senha e suas preferências.",
        tabs: {
            profile: "Perfil",
            security: "Segurança",
            preferences: "Preferências",
            billing: "Cobrança",
            privacy: "Privacidade",
        },
        profile: {
            displayName: "Nome de exibição",
            displayNamePlaceholder: "Como você quer ser chamado",
            phone: "Telefone",
            phonePlaceholder: "+55 51 99999-0000",
            email: "E-mail",
            emailHint: "A troca de e-mail estará disponível em breve.",
            avatar: "Foto de perfil (URL)",
            avatarPlaceholder: "https://exemplo.com/foto.jpg",
            avatarHint:
                "Informe a URL pública da imagem. Com o storage configurado, o envio de arquivo aparece aqui.",
            save: "Salvar",
            avatarUpload: {
                label: "Foto de perfil",
                choose: "Escolher imagem",
                replace: "Trocar imagem",
                remove: "Remover imagem",
                uploading: "Enviando…",
                hint: "JPG, PNG ou WebP, até 4 MB.",
                alt: "Pré-visualização da foto de perfil",
                errors: {
                    tooLarge: "A imagem excede 4 MB.",
                    typeNotAllowed:
                        "Formato não aceito. Escolha JPG, PNG ou WebP.",
                    failed: "Não foi possível enviar a imagem. Tente de novo.",
                },
            },
            validation: {
                displayNameRequired: "Informe o nome de exibição.",
                displayNameMax: "O nome pode ter no máximo 120 caracteres.",
                phoneInvalid:
                    "Informe um telefone válido (dígitos, espaços, +, - e parênteses).",
                avatarReference: "Informe uma URL de imagem válida.",
            },
        },
        security: {
            description:
                "Ao trocar a senha, todas as sessões são encerradas e você precisa entrar de novo.",
            currentPassword: "Senha atual",
            newPassword: "Nova senha",
            confirmPassword: "Confirmar nova senha",
            save: "Alterar senha",
            signOutEverywhere: "Sair de todos os dispositivos",
            signOutEverywhereDescription:
                "Encerra todas as sessões desta conta, inclusive a atual.",
            signOutEverywhereConfirm:
                "Tem certeza que deseja encerrar todas as sessões?",
            signOutEverywhereAction: "Encerrar sessões",
            cancel: "Cancelar",
            validation: {
                required: "Informe a senha.",
                min: "A senha deve ter ao menos 6 caracteres.",
                newPasswordMin: "A nova senha deve ter ao menos 8 caracteres.",
                mismatch: "As senhas não conferem.",
            },
        },
        preferences: {
            description:
                "Tema e idioma acompanham a sua conta em qualquer dispositivo.",
            theme: "Tema",
            themeOptions: {
                light: "Claro",
                dark: "Escuro",
                system: "Sistema",
            },
            language: "Idioma",
            save: "Salvar preferências",
        },
        billing: {
            emptyTitle: "Cobrança em breve",
            emptyDescription:
                "Planos, assinatura e faturas aparecerão aqui quando a cobrança for ativada.",
            description: "Escolha um plano ou gerencie a sua assinatura.",
            plansTitle: "Planos",
            noPlans: "Nenhum plano disponível no momento.",
            loadError: "Não foi possível carregar os planos.",
            subscribe: "Assinar",
            manage: "Gerenciar assinatura",
            currentPlan: "Plano atual",
            unknownPlan: "Plano contratado",
            pricePerInterval: "{price} / {interval}",
            pricePerIntervals: "{price} a cada {count} {interval}",
            interval: {
                day: { one: "dia", other: "dias" },
                week: { one: "semana", other: "semanas" },
                month: { one: "mês", other: "meses" },
                year: { one: "ano", other: "anos" },
            },
            status: {
                active: "Ativa",
                trialing: "Em teste",
                past_due: "Pagamento pendente",
                unpaid: "Não paga",
                paused: "Pausada",
                incomplete: "Incompleta",
                incomplete_expired: "Expirada",
                canceled: "Cancelada",
            },
            renewsOn: "Renova em {date}",
            endsOn: "Termina em {date}",
            pastDueHint:
                "O último pagamento não foi aprovado. Atualize o cartão para manter a assinatura.",
            checkoutPending:
                "Confirmando o pagamento. A assinatura aparece aqui em instantes.",
            checkoutConfirmed: "Assinatura ativa.",
            checkoutCanceled:
                "Pagamento cancelado. Nenhuma cobrança foi feita.",
        },
        privacy: {
            description:
                "Baixe uma cópia dos seus dados ou apague a sua conta. As duas ações valem só para a sua conta.",
            deadline:
                "Pedidos enviados pelo canal de privacidade são respondidos em até 15 dias.",
            policyLink: "Ver a política de privacidade",
            export: {
                title: "Baixar meus dados",
                description:
                    "Gera um arquivo com o seu perfil, os seus registros e o histórico de ações da sua conta.",
                action: "Baixar meus dados",
                filenameHint:
                    "O download vem em JSON, um formato que outros sistemas conseguem ler.",
            },
            delete: {
                title: "Excluir minha conta",
                description:
                    "Apaga o seu perfil, os seus registros e o seu acesso. Não há como desfazer.",
                action: "Excluir minha conta",
                dialogTitle: "Excluir a sua conta?",
                dialogDescription:
                    "Os seus dados serão apagados e você perde o acesso na hora. Confirme com a sua senha.",
                currentPassword: "Senha atual",
                confirm: "Excluir para sempre",
                cancel: "Cancelar",
                unsupportedTitle: "Exclusão pelo canal de privacidade",
                unsupportedDescription:
                    "A sua conta entra pelo Google e não tem senha para confirmar a exclusão. Peça a exclusão pelo canal de privacidade da política.",
                validation: {
                    required: "Informe a senha.",
                    min: "A senha deve ter ao menos 6 caracteres.",
                },
            },
        },
        messages: {
            profileUpdated: "Perfil atualizado.",
            passwordChanged: "Senha alterada. Entre novamente para continuar.",
            preferencesUpdated: "Preferências atualizadas.",
            sessionsRevoked: "Todas as sessões foram encerradas.",
            dataExported: "Os seus dados foram baixados.",
            accountDeleted: "A sua conta foi excluída.",
            loadError: "Não foi possível carregar a sua conta.",
        },
    },
    en: {
        title: "My account",
        subtitle: "Manage your details, your password and your preferences.",
        tabs: {
            profile: "Profile",
            security: "Security",
            preferences: "Preferences",
            billing: "Billing",
            privacy: "Privacy",
        },
        profile: {
            displayName: "Display name",
            displayNamePlaceholder: "How you want to be called",
            phone: "Phone",
            phonePlaceholder: "+1 555 000-0000",
            email: "E-mail",
            emailHint: "Changing your e-mail will be available soon.",
            avatar: "Profile picture (URL)",
            avatarPlaceholder: "https://example.com/photo.jpg",
            avatarHint:
                "Provide the public image URL. With storage configured, file upload shows up here.",
            save: "Save",
            avatarUpload: {
                label: "Profile picture",
                choose: "Choose image",
                replace: "Replace image",
                remove: "Remove image",
                uploading: "Uploading…",
                hint: "JPG, PNG or WebP, up to 4 MB.",
                alt: "Profile picture preview",
                errors: {
                    tooLarge: "The image exceeds 4 MB.",
                    typeNotAllowed:
                        "Unsupported format. Choose JPG, PNG or WebP.",
                    failed: "The image could not be uploaded. Try again.",
                },
            },
            validation: {
                displayNameRequired: "Enter your display name.",
                displayNameMax: "The name can have at most 120 characters.",
                phoneInvalid:
                    "Enter a valid phone number (digits, spaces, +, - and parentheses).",
                avatarReference: "Enter a valid image URL.",
            },
        },
        security: {
            description:
                "Changing your password ends every session, so you will need to sign in again.",
            currentPassword: "Current password",
            newPassword: "New password",
            confirmPassword: "Confirm new password",
            save: "Change password",
            signOutEverywhere: "Sign out everywhere",
            signOutEverywhereDescription:
                "Ends every session of this account, including this one.",
            signOutEverywhereConfirm:
                "Are you sure you want to end every session?",
            signOutEverywhereAction: "End sessions",
            cancel: "Cancel",
            validation: {
                required: "Enter the password.",
                min: "The password must have at least 6 characters.",
                newPasswordMin:
                    "The new password must have at least 8 characters.",
                mismatch: "The passwords do not match.",
            },
        },
        preferences: {
            description:
                "Theme and language follow your account on any device.",
            theme: "Theme",
            themeOptions: {
                light: "Light",
                dark: "Dark",
                system: "System",
            },
            language: "Language",
            save: "Save preferences",
        },
        billing: {
            emptyTitle: "Billing coming soon",
            emptyDescription:
                "Plans, subscription and invoices will show up here once billing is enabled.",
            description: "Pick a plan or manage your subscription.",
            plansTitle: "Plans",
            noPlans: "No plans available right now.",
            loadError: "We couldn't load the plans.",
            subscribe: "Subscribe",
            manage: "Manage subscription",
            currentPlan: "Current plan",
            unknownPlan: "Subscribed plan",
            pricePerInterval: "{price} / {interval}",
            pricePerIntervals: "{price} every {count} {interval}",
            interval: {
                day: { one: "day", other: "days" },
                week: { one: "week", other: "weeks" },
                month: { one: "month", other: "months" },
                year: { one: "year", other: "years" },
            },
            status: {
                active: "Active",
                trialing: "Trial",
                past_due: "Payment due",
                unpaid: "Unpaid",
                paused: "Paused",
                incomplete: "Incomplete",
                incomplete_expired: "Expired",
                canceled: "Canceled",
            },
            renewsOn: "Renews on {date}",
            endsOn: "Ends on {date}",
            pastDueHint:
                "Your last payment was declined. Update your card to keep the subscription.",
            checkoutPending:
                "Confirming your payment. Your subscription will show up here in a moment.",
            checkoutConfirmed: "Subscription active.",
            checkoutCanceled: "Payment canceled. You were not charged.",
        },
        privacy: {
            description:
                "Download a copy of your data or delete your account. Both actions apply to your account only.",
            deadline:
                "Requests sent through the privacy channel are answered within 15 days.",
            policyLink: "Read the privacy policy",
            export: {
                title: "Download my data",
                description:
                    "Builds a file with your profile, your records and the history of actions on your account.",
                action: "Download my data",
                filenameHint:
                    "The download comes as JSON, a format other systems can read.",
            },
            delete: {
                title: "Delete my account",
                description:
                    "Erases your profile, your records and your access. This cannot be undone.",
                action: "Delete my account",
                dialogTitle: "Delete your account?",
                dialogDescription:
                    "Your data will be erased and you lose access right away. Confirm with your password.",
                currentPassword: "Current password",
                confirm: "Delete forever",
                cancel: "Cancel",
                unsupportedTitle: "Deletion through the privacy channel",
                unsupportedDescription:
                    "Your account signs in with Google and has no password to confirm the deletion. Ask for it through the privacy channel in the policy.",
                validation: {
                    required: "Enter the password.",
                    min: "The password must have at least 6 characters.",
                },
            },
        },
        messages: {
            profileUpdated: "Profile updated.",
            passwordChanged: "Password changed. Sign in again to continue.",
            preferencesUpdated: "Preferences updated.",
            sessionsRevoked: "Every session has been ended.",
            dataExported: "Your data has been downloaded.",
            accountDeleted: "Your account has been deleted.",
            loadError: "Your account could not be loaded.",
        },
    },
    es: {
        title: "Mi cuenta",
        subtitle: "Gestiona tus datos, tu contraseña y tus preferencias.",
        tabs: {
            profile: "Perfil",
            security: "Seguridad",
            preferences: "Preferencias",
            billing: "Facturación",
            privacy: "Privacidad",
        },
        profile: {
            displayName: "Nombre visible",
            displayNamePlaceholder: "Cómo quieres que te llamen",
            phone: "Teléfono",
            phonePlaceholder: "+34 600 000 000",
            email: "Correo electrónico",
            emailHint: "El cambio de correo estará disponible pronto.",
            avatar: "Foto de perfil (URL)",
            avatarPlaceholder: "https://ejemplo.com/foto.jpg",
            avatarHint:
                "Indica la URL pública de la imagen. Con el storage configurado, la subida de archivo aparece aquí.",
            save: "Guardar",
            avatarUpload: {
                label: "Foto de perfil",
                choose: "Elegir imagen",
                replace: "Cambiar imagen",
                remove: "Quitar imagen",
                uploading: "Subiendo…",
                hint: "JPG, PNG o WebP, hasta 4 MB.",
                alt: "Vista previa de la foto de perfil",
                errors: {
                    tooLarge: "La imagen supera los 4 MB.",
                    typeNotAllowed:
                        "Formato no admitido. Elige JPG, PNG o WebP.",
                    failed: "No se pudo subir la imagen. Inténtalo de nuevo.",
                },
            },
            validation: {
                displayNameRequired: "Indica el nombre visible.",
                displayNameMax:
                    "El nombre puede tener como máximo 120 caracteres.",
                phoneInvalid:
                    "Indica un teléfono válido (dígitos, espacios, +, - y paréntesis).",
                avatarReference: "Indica una URL de imagen válida.",
            },
        },
        security: {
            description:
                "Al cambiar la contraseña se cierran todas las sesiones y deberás entrar de nuevo.",
            currentPassword: "Contraseña actual",
            newPassword: "Nueva contraseña",
            confirmPassword: "Confirmar nueva contraseña",
            save: "Cambiar contraseña",
            signOutEverywhere: "Cerrar sesión en todos los dispositivos",
            signOutEverywhereDescription:
                "Cierra todas las sesiones de esta cuenta, incluida la actual.",
            signOutEverywhereConfirm:
                "¿Seguro que quieres cerrar todas las sesiones?",
            signOutEverywhereAction: "Cerrar sesiones",
            cancel: "Cancelar",
            validation: {
                required: "Indica la contraseña.",
                min: "La contraseña debe tener al menos 6 caracteres.",
                newPasswordMin:
                    "La nueva contraseña debe tener al menos 8 caracteres.",
                mismatch: "Las contraseñas no coinciden.",
            },
        },
        preferences: {
            description:
                "El tema y el idioma acompañan a tu cuenta en cualquier dispositivo.",
            theme: "Tema",
            themeOptions: {
                light: "Claro",
                dark: "Oscuro",
                system: "Sistema",
            },
            language: "Idioma",
            save: "Guardar preferencias",
        },
        billing: {
            emptyTitle: "Facturación próximamente",
            emptyDescription:
                "Planes, suscripción y facturas aparecerán aquí cuando se active la facturación.",
            description: "Elige un plan o gestiona tu suscripción.",
            plansTitle: "Planes",
            noPlans: "No hay planes disponibles por ahora.",
            loadError: "No pudimos cargar los planes.",
            subscribe: "Suscribirse",
            manage: "Gestionar suscripción",
            currentPlan: "Plan actual",
            unknownPlan: "Plan contratado",
            pricePerInterval: "{price} / {interval}",
            pricePerIntervals: "{price} cada {count} {interval}",
            interval: {
                day: { one: "día", other: "días" },
                week: { one: "semana", other: "semanas" },
                month: { one: "mes", other: "meses" },
                year: { one: "año", other: "años" },
            },
            status: {
                active: "Activa",
                trialing: "En prueba",
                past_due: "Pago pendiente",
                unpaid: "Impaga",
                paused: "Pausada",
                incomplete: "Incompleta",
                incomplete_expired: "Vencida",
                canceled: "Cancelada",
            },
            renewsOn: "Se renueva el {date}",
            endsOn: "Termina el {date}",
            pastDueHint:
                "Tu último pago fue rechazado. Actualiza la tarjeta para mantener la suscripción.",
            checkoutPending:
                "Confirmando el pago. La suscripción aparecerá aquí en unos instantes.",
            checkoutConfirmed: "Suscripción activa.",
            checkoutCanceled: "Pago cancelado. No se realizó ningún cobro.",
        },
        privacy: {
            description:
                "Descarga una copia de tus datos o elimina tu cuenta. Ambas acciones se aplican solo a tu cuenta.",
            deadline:
                "Las solicitudes enviadas por el canal de privacidad se responden en un plazo de 15 días.",
            policyLink: "Ver la política de privacidad",
            export: {
                title: "Descargar mis datos",
                description:
                    "Genera un archivo con tu perfil, tus registros y el historial de acciones de tu cuenta.",
                action: "Descargar mis datos",
                filenameHint:
                    "La descarga llega en JSON, un formato que otros sistemas pueden leer.",
            },
            delete: {
                title: "Eliminar mi cuenta",
                description:
                    "Borra tu perfil, tus registros y tu acceso. No se puede deshacer.",
                action: "Eliminar mi cuenta",
                dialogTitle: "¿Eliminar tu cuenta?",
                dialogDescription:
                    "Tus datos se borrarán y perderás el acceso de inmediato. Confirma con tu contraseña.",
                currentPassword: "Contraseña actual",
                confirm: "Eliminar para siempre",
                cancel: "Cancelar",
                unsupportedTitle: "Eliminación por el canal de privacidad",
                unsupportedDescription:
                    "Tu cuenta entra con Google y no tiene contraseña para confirmar la eliminación. Solicítala por el canal de privacidad de la política.",
                validation: {
                    required: "Indica la contraseña.",
                    min: "La contraseña debe tener al menos 6 caracteres.",
                },
            },
        },
        messages: {
            profileUpdated: "Perfil actualizado.",
            passwordChanged:
                "Contraseña cambiada. Vuelve a entrar para continuar.",
            preferencesUpdated: "Preferencias actualizadas.",
            sessionsRevoked: "Se cerraron todas las sesiones.",
            dataExported: "Tus datos se han descargado.",
            accountDeleted: "Tu cuenta se ha eliminado.",
            loadError: "No se pudo cargar tu cuenta.",
        },
    },
};
