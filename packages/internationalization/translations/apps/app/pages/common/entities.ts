export const commonEntitiesPageTranslations = {
    "pt-br": {
        list: {
            searchPlaceholder: "Buscar por nome ou descrição",
            empty: "Nenhuma entidade cadastrada.",
            columns: {
                photo: "Foto",
                name: "Nome",
                type: "Tipo",
                enabled: "Ativo",
                createdAt: "Criado em",
                actions: "Ações",
            },
            typeLabels: {
                franchise: "Franquia",
                customer: "Cliente",
                collaborator: "Colaborador",
            },
            enabledLabels: {
                yes: "Sim",
                no: "Não",
            },
        },
        form: {
            name: "Nome",
            description: "Descrição",
            type: "Tipo",
            photo: "Foto (URL)",
            photoPlaceholder: "https://",
            photoHint:
                "Informe a URL pública da imagem. Em produção, substitua por upload para storage.",
            genre: "Gênero",
            genreUnset: "Não informar",
            birthdate: "Data de nascimento",
            enabled: "Ativo",
            createdAt: "Criado em",
            save: "Salvar",
            genreOptions: {
                male: "Masculino",
                female: "Feminino",
                other: "Outro",
            },
            photoUpload: {
                label: "Foto",
                choose: "Escolher imagem",
                replace: "Trocar imagem",
                remove: "Remover imagem",
                uploading: "Enviando…",
                hint: "JPG, PNG ou WebP, até 4 MB.",
                alt: "Pré-visualização da foto",
                errors: {
                    tooLarge: "A imagem excede 4 MB.",
                    typeNotAllowed:
                        "Formato não aceito. Escolha JPG, PNG ou WebP.",
                    failed: "Não foi possível enviar a imagem. Tente de novo.",
                },
            },
            validation: {
                nameRequired: "Informe o nome.",
                nameMax: "O nome pode ter no máximo 255 caracteres.",
                descriptionMax:
                    "A descrição pode ter no máximo 10.000 caracteres.",
                typeInvalid: "Selecione um tipo válido.",
                photoReference:
                    "Envie uma imagem ou informe uma URL válida (http ou https).",
                photoMax: "A URL da foto é longa demais.",
                genreMax: "Valor inválido para gênero.",
                birthdateInvalid: "Informe uma data válida (AAAA-MM-DD).",
            },
        },
        messages: {
            created: "Entidade criada com sucesso.",
            updated: "Entidade atualizada com sucesso.",
            deleted: "Entidade removida com sucesso.",
            loadError: "Não foi possível carregar a entidade.",
        },
    },
    en: {
        list: {
            searchPlaceholder: "Search by name or description",
            empty: "No entities yet.",
            columns: {
                photo: "Photo",
                name: "Name",
                type: "Type",
                enabled: "Active",
                createdAt: "Created",
                actions: "Actions",
            },
            typeLabels: {
                franchise: "Franchise",
                customer: "Customer",
                collaborator: "Collaborator",
            },
            enabledLabels: {
                yes: "Yes",
                no: "No",
            },
        },
        form: {
            name: "Name",
            description: "Description",
            type: "Type",
            photo: "Photo (URL)",
            photoPlaceholder: "https://",
            photoHint:
                "Enter a public image URL. In production, replace with storage upload.",
            genre: "Gender",
            genreUnset: "Prefer not to say",
            birthdate: "Birth date",
            enabled: "Active",
            createdAt: "Created at",
            save: "Save",
            genreOptions: {
                male: "Male",
                female: "Female",
                other: "Other",
            },
            photoUpload: {
                label: "Photo",
                choose: "Choose image",
                replace: "Replace image",
                remove: "Remove image",
                uploading: "Uploading…",
                hint: "JPG, PNG or WebP, up to 4 MB.",
                alt: "Photo preview",
                errors: {
                    tooLarge: "The image exceeds 4 MB.",
                    typeNotAllowed:
                        "Format not accepted. Choose JPG, PNG or WebP.",
                    failed: "Could not upload the image. Try again.",
                },
            },
            validation: {
                nameRequired: "Name is required.",
                nameMax: "Name must be at most 255 characters.",
                descriptionMax:
                    "Description must be at most 10,000 characters.",
                typeInvalid: "Select a valid type.",
                photoReference:
                    "Upload an image or enter a valid URL (http or https).",
                photoMax: "Photo URL is too long.",
                genreMax: "Invalid gender value.",
                birthdateInvalid: "Enter a valid date (YYYY-MM-DD).",
            },
        },
        messages: {
            created: "Entity created successfully.",
            updated: "Entity updated successfully.",
            deleted: "Entity removed successfully.",
            loadError: "Could not load the entity.",
        },
    },
    es: {
        list: {
            searchPlaceholder: "Buscar por nombre o descripción",
            empty: "No hay entidades registradas.",
            columns: {
                photo: "Foto",
                name: "Nombre",
                type: "Tipo",
                enabled: "Activo",
                createdAt: "Creado",
                actions: "Acciones",
            },
            typeLabels: {
                franchise: "Franquicia",
                customer: "Cliente",
                collaborator: "Colaborador",
            },
            enabledLabels: {
                yes: "Sí",
                no: "No",
            },
        },
        form: {
            name: "Nombre",
            description: "Descripción",
            type: "Tipo",
            photo: "Foto (URL)",
            photoPlaceholder: "https://",
            photoHint:
                "Indica la URL pública de la imagen. En producción, sustituye por subida a almacenamiento.",
            genre: "Género",
            genreUnset: "Prefiero no decir",
            birthdate: "Fecha de nacimiento",
            enabled: "Activo",
            createdAt: "Creado el",
            save: "Guardar",
            genreOptions: {
                male: "Masculino",
                female: "Femenino",
                other: "Otro",
            },
            photoUpload: {
                label: "Foto",
                choose: "Elegir imagen",
                replace: "Cambiar imagen",
                remove: "Quitar imagen",
                uploading: "Subiendo…",
                hint: "JPG, PNG o WebP, hasta 4 MB.",
                alt: "Vista previa de la foto",
                errors: {
                    tooLarge: "La imagen supera los 4 MB.",
                    typeNotAllowed:
                        "Formato no aceptado. Elige JPG, PNG o WebP.",
                    failed: "No se pudo subir la imagen. Inténtalo de nuevo.",
                },
            },
            validation: {
                nameRequired: "Indica el nombre.",
                nameMax: "El nombre puede tener como máximo 255 caracteres.",
                descriptionMax:
                    "La descripción puede tener como máximo 10.000 caracteres.",
                typeInvalid: "Selecciona un tipo válido.",
                photoReference:
                    "Sube una imagen o introduce una URL válida (http o https).",
                photoMax: "La URL de la foto es demasiado larga.",
                genreMax: "Valor de género no válido.",
                birthdateInvalid: "Introduce una fecha válida (AAAA-MM-DD).",
            },
        },
        messages: {
            created: "Entidad creada correctamente.",
            updated: "Entidad actualizada correctamente.",
            deleted: "Entidad eliminada correctamente.",
            loadError: "No se pudo cargar la entidad.",
        },
    },
};
