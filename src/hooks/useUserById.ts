import { useQuery, useQueryClient } from "@tanstack/react-query";
import { doc, getDoc, documentId, query, where, getDocs, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { queryKeys } from "@/lib/queryKeys";
import type { User } from "@/types";

async function fetchUser(userId: string): Promise<User | null> {
  const userDoc = await getDoc(doc(db, "users", userId));
  if (!userDoc.exists()) return null;
  return { id: userDoc.id, ...userDoc.data() } as User;
}

async function fetchUsersBatch(userIds: string[]): Promise<Map<string, User>> {
  const usersMap = new Map<string, User>();
  if (userIds.length === 0) return usersMap;

  // Firestore "in" query supports max 30 items
  const chunks: string[][] = [];
  for (let i = 0; i < userIds.length; i += 30) {
    chunks.push(userIds.slice(i, i + 30));
  }

  await Promise.all(
    chunks.map(async (chunk) => {
      const q = query(
        collection(db, "users"),
        where(documentId(), "in", chunk)
      );
      const snapshot = await getDocs(q);
      snapshot.docs.forEach((doc) => {
        usersMap.set(doc.id, { id: doc.id, ...doc.data() } as User);
      });
    })
  );

  return usersMap;
}

export function useUserById(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.users.detail(userId || ""),
    queryFn: () => fetchUser(userId!),
    enabled: !!userId,
  });
}

export function usePrefetchUsers() {
  const queryClient = useQueryClient();

  const prefetchUsers = async (userIds: string[]) => {
    // Filter out already cached users
    const uncachedIds = userIds.filter(
      (id) => !queryClient.getQueryData(queryKeys.users.detail(id))
    );

    if (uncachedIds.length === 0) return;

    const usersMap = await fetchUsersBatch(uncachedIds);

    // Populate cache for each user
    usersMap.forEach((user, id) => {
      queryClient.setQueryData(queryKeys.users.detail(id), user);
    });
  };

  return { prefetchUsers };
}

export { fetchUser, fetchUsersBatch };
