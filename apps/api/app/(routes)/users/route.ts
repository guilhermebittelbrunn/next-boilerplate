import { userRepository } from "@/(shared)/repositories/user.repository";
import { authGuard } from "@/app/(guards)/auth";

export const GET = authGuard(async () => {
    const users = await userRepository.list();
    return Response.json({ data: users });
});
