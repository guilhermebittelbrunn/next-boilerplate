export const adminAuditTrailPageTranslations = {
    "pt-br": {
        list: {
            searchPlaceholder: "Buscar por autor ou alvo",
            empty: "Nenhum evento registrado.",
            emptyValue: "—",
            columns: {
                createdAt: "Quando",
                action: "Ação",
                actor: "Autor",
                target: "Alvo",
                changedFields: "Campos alterados",
            },
            actionLabels: {
                "impersonation.session": "Acesso à conta de outro usuário",
                "user.update": "Perfil alterado pelo admin",
                "user.delete": "Usuário excluído",
                "account.sessions.revoke": "Sessões encerradas",
                "account.password.change": "Senha alterada",
            },
        },
        filters: {
            userLabel: "Usuário",
            userPlaceholder: "Todos os usuários",
            userAll: "Todos os usuários",
            fromLabel: "De",
            toLabel: "Até",
            datePlaceholder: "Escolha uma data",
            apply: "Aplicar",
            clear: "Limpar",
            validation: {
                rangeInverted: "A data inicial não pode ser posterior à final.",
            },
        },
    },
    en: {
        list: {
            searchPlaceholder: "Search by actor or target",
            empty: "No events recorded.",
            emptyValue: "—",
            columns: {
                createdAt: "When",
                action: "Action",
                actor: "Actor",
                target: "Target",
                changedFields: "Changed fields",
            },
            actionLabels: {
                "impersonation.session": "Acted on another user's account",
                "user.update": "Profile changed by an admin",
                "user.delete": "User deleted",
                "account.sessions.revoke": "Sessions signed out",
                "account.password.change": "Password changed",
            },
        },
        filters: {
            userLabel: "User",
            userPlaceholder: "All users",
            userAll: "All users",
            fromLabel: "From",
            toLabel: "To",
            datePlaceholder: "Pick a date",
            apply: "Apply",
            clear: "Clear",
            validation: {
                rangeInverted: "The start date cannot be after the end date.",
            },
        },
    },
    es: {
        list: {
            searchPlaceholder: "Buscar por autor o destinatario",
            empty: "No hay eventos registrados.",
            emptyValue: "—",
            columns: {
                createdAt: "Cuándo",
                action: "Acción",
                actor: "Autor",
                target: "Destinatario",
                changedFields: "Campos modificados",
            },
            actionLabels: {
                "impersonation.session": "Acceso a la cuenta de otro usuario",
                "user.update": "Perfil modificado por un administrador",
                "user.delete": "Usuario eliminado",
                "account.sessions.revoke": "Sesiones cerradas",
                "account.password.change": "Contraseña modificada",
            },
        },
        filters: {
            userLabel: "Usuario",
            userPlaceholder: "Todos los usuarios",
            userAll: "Todos los usuarios",
            fromLabel: "Desde",
            toLabel: "Hasta",
            datePlaceholder: "Elige una fecha",
            apply: "Aplicar",
            clear: "Limpiar",
            validation: {
                rangeInverted:
                    "La fecha inicial no puede ser posterior a la final.",
            },
        },
    },
};
