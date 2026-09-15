export const commonAccountPageTranslations = {
    "pt-br": {
        title: "Minha conta",
        subtitle: "Gerencie seus dados, sua senha e suas preferências.",
        tabs: {
            profile: "Perfil",
            security: "Segurança",
            preferences: "Preferências",
            billing: "Cobrança",
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
        },
        messages: {
            profileUpdated: "Perfil atualizado.",
            passwordChanged: "Senha alterada. Entre novamente para continuar.",
            preferencesUpdated: "Preferências atualizadas.",
            sessionsRevoked: "Todas as sessões foram encerradas.",
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
        },
        messages: {
            profileUpdated: "Profile updated.",
            passwordChanged: "Password changed. Sign in again to continue.",
            preferencesUpdated: "Preferences updated.",
            sessionsRevoked: "Every session has been ended.",
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
        },
        messages: {
            profileUpdated: "Perfil actualizado.",
            passwordChanged:
                "Contraseña cambiada. Vuelve a entrar para continuar.",
            preferencesUpdated: "Preferencias actualizadas.",
            sessionsRevoked: "Se cerraron todas las sesiones.",
            loadError: "No se pudo cargar tu cuenta.",
        },
    },
};
