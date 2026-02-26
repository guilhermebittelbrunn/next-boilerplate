"use server";

import { auth } from "@repo/auth/server";

export const searchUsers = async (
  query: string
): Promise<
  | {
      data: string[];
    }
  | {
      error: unknown;
    }
> => {
  try {
    const { userId } = await auth();

    if (!userId) {
      throw new Error("Not logged in");
    }

    // Firebase has no organization members list; return empty until you have a user list (e.g. Firestore)
    return { data: [] };
  } catch (error) {
    return { error };
  }
};
