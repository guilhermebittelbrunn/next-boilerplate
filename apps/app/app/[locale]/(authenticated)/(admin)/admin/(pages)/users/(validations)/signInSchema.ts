import { z } from "zod";

const MIN_PASSWORD_LENGTH = 6;

export const createUserSchema = z.object({
    email: z.string().email("Email inválido"),
    password: z
        .string()
        .min(MIN_PASSWORD_LENGTH, "A senha deve ter pelo menos 6 caracteres"),
});

export type CreateUserFormValues = z.infer<typeof createUserSchema>;
