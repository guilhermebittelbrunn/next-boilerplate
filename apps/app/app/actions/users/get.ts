"use server";

import { auth, getUserById } from "@repo/auth/server";

const colors = [
  "var(--color-red-500)",
  "var(--color-orange-500)",
  "var(--color-amber-500)",
  "var(--color-yellow-500)",
  "var(--color-lime-500)",
  "var(--color-green-500)",
  "var(--color-emerald-500)",
  "var(--color-teal-500)",
  "var(--color-cyan-500)",
  "var(--color-sky-500)",
  "var(--color-blue-500)",
  "var(--color-indigo-500)",
  "var(--color-violet-500)",
  "var(--color-purple-500)",
  "var(--color-fuchsia-500)",
  "var(--color-pink-500)",
  "var(--color-rose-500)",
];

export const getUsers = async (
  userIds: string[]
): Promise<
  | {
      data: Liveblocks["UserMeta"]["info"][];
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

    const data: Liveblocks["UserMeta"]["info"][] = [];

    for (const uid of userIds) {
      const userRecord = await getUserById(uid);
      if (userRecord) {
        data.push({
          name: userRecord.displayName ?? userRecord.email ?? "Unknown user",
          picture: userRecord.photoURL ?? "",
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
    }

    return { data };
  } catch (error) {
    return { error };
  }
};
