import { EXISTING_PASSWORD_MIN_LENGTH } from "@repo/shared/utils/helpers/passwordPolicy";
import { z } from "zod";

export const signInSchema = z.object({
    email: z.string().email("Email inválido"),
    password: z
        .string()
        .min(
            EXISTING_PASSWORD_MIN_LENGTH,
            "A senha deve ter pelo menos 6 caracteres"
        ),
});

export type SignInFormValues = z.infer<typeof signInSchema>;
