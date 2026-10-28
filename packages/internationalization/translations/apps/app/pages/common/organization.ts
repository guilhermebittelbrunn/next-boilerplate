export const commonOrganizationPageTranslations = {
    "pt-br": {
        title: "Equipe",
        description:
            "As pessoas da equipe veem e editam os mesmos registros. Só o dono convida e remove membros, e pode passar a propriedade a outro membro.",
        members: {
            title: "Membros",
            columns: {
                name: "Nome",
                email: "E-mail",
                role: "Papel",
                joinedAt: "Entrou em",
                actions: "Ações",
            },
            roles: {
                owner: "Dono",
                member: "Membro",
            },
            unnamed: "Sem nome",
            noEmail: "Conta indisponível",
            emptyText: "Nenhum membro encontrado.",
            searchPlaceholder: "Buscar por nome ou e-mail",
            remove: "Remover da equipe",
            removeConfirmTitle: "Remover este membro?",
            removeConfirmDescription:
                "A pessoa perde o acesso aos registros da equipe e volta para a própria conta. Os registros que ela criou ficam com a equipe.",
            removed: "Membro removido da equipe.",
        },
        transfer: {
            action: "Tornar dono",
            confirmTitle: "Transferir a propriedade da equipe?",
            confirmDescription:
                "{name} passa a ser dono da equipe, e você continua nela como membro. Só o dono convida e remove pessoas, e {name} pode devolver a propriedade a você. Os registros continuam com a equipe, mesmo que você saia depois.",
            confirm: "Transferir",
            cancel: "Cancelar",
            done: "{name} agora é dono da equipe.",
        },
        invite: {
            title: "Convidar pessoa",
            description:
                "Enviamos um link por e-mail. Ele vale por 7 dias e só pode ser usado uma vez, por uma conta com este mesmo e-mail.",
            emailLabel: "E-mail",
            emailPlaceholder: "pessoa@empresa.com",
            submit: "Enviar convite",
            sent: "Convite enviado.",
            deliveryFailed:
                "O convite foi criado, mas o e-mail não saiu. Tente reenviar em instantes.",
            validation: {
                required: "Informe o e-mail.",
                invalid: "Informe um e-mail válido.",
            },
        },
        invitations: {
            title: "Convites pendentes",
            columns: {
                email: "E-mail",
                lastSentAt: "Enviado em",
                expiresAt: "Expira em",
                actions: "Ações",
            },
            expired: "Expirado",
            resend: "Reenviar",
            resent: "Convite reenviado.",
            revoke: "Revogar",
            revokeConfirmTitle: "Revogar este convite?",
            revokeConfirmDescription:
                "O link enviado deixa de funcionar. Você pode convidar a mesma pessoa de novo depois.",
            revoked: "Convite revogado.",
            emptyText: "Nenhum convite pendente.",
            searchPlaceholder: "Buscar por e-mail",
        },
        leave: {
            title: "Sair da equipe",
            description:
                "Você deixa de ver os registros da equipe e volta para a sua própria conta. Os registros criados na equipe ficam com ela.",
            action: "Sair da equipe",
            confirmTitle: "Sair da equipe?",
            confirmDescription:
                "Para voltar, você vai precisar de um convite novo do dono.",
            confirm: "Sair",
            cancel: "Cancelar",
            done: "Você saiu da equipe.",
        },
    },
    en: {
        title: "Team",
        description:
            "Team members see and edit the same records. Only the owner invites and removes members, and can hand ownership to another member.",
        members: {
            title: "Members",
            columns: {
                name: "Name",
                email: "Email",
                role: "Role",
                joinedAt: "Joined",
                actions: "Actions",
            },
            roles: {
                owner: "Owner",
                member: "Member",
            },
            unnamed: "No name",
            noEmail: "Account unavailable",
            emptyText: "No members found.",
            searchPlaceholder: "Search by name or email",
            remove: "Remove from team",
            removeConfirmTitle: "Remove this member?",
            removeConfirmDescription:
                "They lose access to the team's records and go back to their own account. The records they created stay with the team.",
            removed: "Member removed from the team.",
        },
        transfer: {
            action: "Make owner",
            confirmTitle: "Transfer team ownership?",
            confirmDescription:
                "{name} becomes the team owner and you stay on as a member. Only the owner invites and removes people, and {name} can hand ownership back to you. Records stay with the team, even if you leave later.",
            confirm: "Transfer",
            cancel: "Cancel",
            done: "{name} is now the team owner.",
        },
        invite: {
            title: "Invite someone",
            description:
                "We send a link by email. It is valid for 7 days and can be used once, by an account with this same email.",
            emailLabel: "Email",
            emailPlaceholder: "person@company.com",
            submit: "Send invitation",
            sent: "Invitation sent.",
            deliveryFailed:
                "The invitation was created, but the email did not go out. Try resending in a moment.",
            validation: {
                required: "Enter the email.",
                invalid: "Enter a valid email.",
            },
        },
        invitations: {
            title: "Pending invitations",
            columns: {
                email: "Email",
                lastSentAt: "Sent",
                expiresAt: "Expires",
                actions: "Actions",
            },
            expired: "Expired",
            resend: "Resend",
            resent: "Invitation sent again.",
            revoke: "Revoke",
            revokeConfirmTitle: "Revoke this invitation?",
            revokeConfirmDescription:
                "The link that was sent stops working. You can invite the same person again later.",
            revoked: "Invitation revoked.",
            emptyText: "No pending invitations.",
            searchPlaceholder: "Search by email",
        },
        leave: {
            title: "Leave the team",
            description:
                "You stop seeing the team's records and go back to your own account. Records created in the team stay with it.",
            action: "Leave the team",
            confirmTitle: "Leave the team?",
            confirmDescription:
                "To come back, you will need a new invitation from the owner.",
            confirm: "Leave",
            cancel: "Cancel",
            done: "You left the team.",
        },
    },
    es: {
        title: "Equipo",
        description:
            "Las personas del equipo ven y editan los mismos registros. Solo el dueño invita y quita miembros, y puede pasar la propiedad a otro miembro.",
        members: {
            title: "Miembros",
            columns: {
                name: "Nombre",
                email: "Correo",
                role: "Rol",
                joinedAt: "Se unió",
                actions: "Acciones",
            },
            roles: {
                owner: "Dueño",
                member: "Miembro",
            },
            unnamed: "Sin nombre",
            noEmail: "Cuenta no disponible",
            emptyText: "No se encontraron miembros.",
            searchPlaceholder: "Buscar por nombre o correo",
            remove: "Quitar del equipo",
            removeConfirmTitle: "¿Quitar a este miembro?",
            removeConfirmDescription:
                "La persona pierde el acceso a los registros del equipo y vuelve a su propia cuenta. Los registros que creó se quedan con el equipo.",
            removed: "Miembro quitado del equipo.",
        },
        transfer: {
            action: "Hacer dueño",
            confirmTitle: "¿Transferir la propiedad del equipo?",
            confirmDescription:
                "{name} pasa a ser dueño del equipo y tú sigues en él como miembro. Solo el dueño invita y quita personas, y {name} puede devolverte la propiedad. Los registros siguen con el equipo, aunque salgas después.",
            confirm: "Transferir",
            cancel: "Cancelar",
            done: "{name} ahora es dueño del equipo.",
        },
        invite: {
            title: "Invitar a alguien",
            description:
                "Enviamos un enlace por correo. Es válido por 7 días y se puede usar una sola vez, con una cuenta de este mismo correo.",
            emailLabel: "Correo",
            emailPlaceholder: "persona@empresa.com",
            submit: "Enviar invitación",
            sent: "Invitación enviada.",
            deliveryFailed:
                "La invitación se creó, pero el correo no salió. Intenta reenviarla en unos instantes.",
            validation: {
                required: "Ingresa el correo.",
                invalid: "Ingresa un correo válido.",
            },
        },
        invitations: {
            title: "Invitaciones pendientes",
            columns: {
                email: "Correo",
                lastSentAt: "Enviada",
                expiresAt: "Vence",
                actions: "Acciones",
            },
            expired: "Vencida",
            resend: "Reenviar",
            resent: "Invitación reenviada.",
            revoke: "Revocar",
            revokeConfirmTitle: "¿Revocar esta invitación?",
            revokeConfirmDescription:
                "El enlace enviado deja de funcionar. Puedes invitar a la misma persona de nuevo más tarde.",
            revoked: "Invitación revocada.",
            emptyText: "No hay invitaciones pendientes.",
            searchPlaceholder: "Buscar por correo",
        },
        leave: {
            title: "Salir del equipo",
            description:
                "Dejas de ver los registros del equipo y vuelves a tu propia cuenta. Los registros creados en el equipo se quedan con él.",
            action: "Salir del equipo",
            confirmTitle: "¿Salir del equipo?",
            confirmDescription:
                "Para volver, necesitarás una nueva invitación del dueño.",
            confirm: "Salir",
            cancel: "Cancelar",
            done: "Saliste del equipo.",
        },
    },
};
