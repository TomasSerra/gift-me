import { useQuery } from "@tanstack/react-query";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { queryKeys } from "@/lib/queryKeys";
import type { Friendship } from "@/types";

export type FriendshipStatusResult = {
  status: "friends" | "pending_sent" | "pending_received" | "none";
  requestId?: string;
};

async function fetchFriendshipStatus(
  currentUserId: string,
  targetUserId: string
): Promise<FriendshipStatusResult> {
  // Check if already friends
  const friendshipQuery = query(
    collection(db, "friendships"),
    where("users", "array-contains", currentUserId)
  );
  const friendships = await getDocs(friendshipQuery);
  const isFriend = friendships.docs.some((doc) => {
    const data = doc.data() as Friendship;
    return data.users.includes(targetUserId);
  });

  if (isFriend) {
    return { status: "friends" };
  }

  // Check sent requests
  const sentRequestQuery = query(
    collection(db, "friendRequests"),
    where("fromUserId", "==", currentUserId),
    where("toUserId", "==", targetUserId),
    where("status", "==", "pending")
  );
  const sentRequests = await getDocs(sentRequestQuery);

  if (!sentRequests.empty) {
    return { status: "pending_sent", requestId: sentRequests.docs[0].id };
  }

  // Check received requests
  const receivedRequestQuery = query(
    collection(db, "friendRequests"),
    where("fromUserId", "==", targetUserId),
    where("toUserId", "==", currentUserId),
    where("status", "==", "pending")
  );
  const receivedRequests = await getDocs(receivedRequestQuery);

  if (!receivedRequests.empty) {
    return { status: "pending_received", requestId: receivedRequests.docs[0].id };
  }

  return { status: "none" };
}

export function useFriendshipStatus(
  currentUserId: string | undefined,
  targetUserId: string | undefined
) {
  return useQuery({
    queryKey: queryKeys.friendshipStatus(currentUserId || "", targetUserId || ""),
    queryFn: () => fetchFriendshipStatus(currentUserId!, targetUserId!),
    enabled: !!currentUserId && !!targetUserId && currentUserId !== targetUserId,
  });
}

export { fetchFriendshipStatus };
