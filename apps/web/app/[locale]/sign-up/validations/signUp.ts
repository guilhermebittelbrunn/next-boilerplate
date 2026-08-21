import { z } from "zod";

const MIN_PASSWORD_LENGTH = 6;

export const signUpSchema = z
    .object({
        email: z.string().email("Email inválido"),
        password: z
            .string()
            .min(
                MIN_PASSWORD_LENGTH,
                "A senha deve ter pelo menos 6 caracteres"
            ),
        confirmPassword: z
            .string()
            .min(
                MIN_PASSWORD_LENGTH,
                "A senha deve ter pelo menos 6 caracteres"
            ),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "As senhas não coincidem",
        path: ["confirmPassword"],
    });

export type SignUpFormValues = z.infer<typeof signUpSchema>;
