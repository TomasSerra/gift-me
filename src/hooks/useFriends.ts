import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  serverTimestamp,
  onSnapshot,
  or,
  limit,
} from "firebase/firestore";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/toast";
import { queryKeys } from "@/lib/queryKeys";
import { fetchUsersBatch, fetchUser } from "./useUserById";
import { fetchFriendshipStatus } from "./useFriendshipStatus";
import type { User, FriendRequest, Friendship, UserWithFriendship } from "@/types";

export function useFriends() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check for cached data to avoid showing loader on re-mount
  const cachedFriends = queryClient.getQueryData<User[]>(
    queryKeys.friends.all(user?.id || "")
  );

  const [friends, setFriends] = useState<User[]>(cachedFriends || []);
  const [loading, setLoading] = useState(!cachedFriends);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "friendships"),
      or(where("users", "array-contains", user.id))
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const friendIds = snapshot.docs.flatMap((doc) => {
        const data = doc.data() as Friendship;
        return data.users.filter((id) => id !== user.id);
      });

      if (friendIds.length === 0) {
        setFriends([]);
        setLoading(false);
        return;
      }

      // Batch fetch all friends
      const usersMap = await fetchUsersBatch(friendIds);

      // Populate cache for each user
      usersMap.forEach((userData, id) => {
        queryClient.setQueryData(queryKeys.users.detail(id), userData);
      });

      const friendsData = friendIds
        .map((id) => usersMap.get(id))
        .filter((f): f is User => f !== undefined);

      setFriends(friendsData);
      setLoading(false);

      // Update cache for next mount
      queryClient.setQueryData(queryKeys.friends.all(user.id), friendsData);
    });

    return () => unsubscribe();
  }, [user, queryClient]);

  return { friends, loading };
}

export function useFriendRequests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check for cached data to avoid showing loader on re-mount
  const cachedRequests = queryClient.getQueryData<(FriendRequest & { fromUser: User })[]>(
    queryKeys.friends.requests(user?.id || "")
  );

  const [requests, setRequests] = useState<(FriendRequest & { fromUser: User })[]>(cachedRequests || []);
  const [loading, setLoading] = useState(!cachedRequests);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "friendRequests"),
      where("toUserId", "==", user.id),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        setRequests([]);
        setLoading(false);
        return;
      }

      const requestDocs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as (FriendRequest & { id: string })[];

      // Batch fetch all users who sent requests
      const userIds = requestDocs.map((r) => r.fromUserId);
      const usersMap = await fetchUsersBatch(userIds);

      // Populate cache for each user
      usersMap.forEach((userData, id) => {
        queryClient.setQueryData(queryKeys.users.detail(id), userData);
      });

      const requestsWithUsers = requestDocs
        .map((request) => {
          const fromUser = usersMap.get(request.fromUserId);
          if (!fromUser) return null;
          return { ...request, fromUser };
        })
        .filter((r): r is FriendRequest & { fromUser: User } => r !== null);

      setRequests(requestsWithUsers);
      setLoading(false);

      // Update cache for next mount
      queryClient.setQueryData(queryKeys.friends.requests(user.id), requestsWithUsers);
    });

    return () => unsubscribe();
  }, [user, queryClient]);

  return { requests, loading };
}

export function useSearchUsers() {
  const { user } = useAuth();
  const [results, setResults] = useState<UserWithFriendship[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async (searchTerm: string) => {
    if (!user || searchTerm.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);

    try {
      const searchLower = searchTerm.toLowerCase();

      // Search with limit
      const usersRef = collection(db, "users");
      const snapshot = await getDocs(query(usersRef, limit(50)));

      const matchedUsers = snapshot.docs
        .filter((doc) => {
          const data = doc.data();
          const username = (data.username || "").toLowerCase();
          const firstName = (data.firstName || "").toLowerCase();
          const lastName = (data.lastName || "").toLowerCase();

          return (
            doc.id !== user.id &&
            (username.includes(searchLower) ||
              firstName.includes(searchLower) ||
              lastName.includes(searchLower))
          );
        })
        .slice(0, 20) // Limit results
        .map((doc) => ({ id: doc.id, ...doc.data() } as User));

      // Fetch friendship status for each user (uses cache if available)
      const usersWithStatus = await Promise.all(
        matchedUsers.map(async (matchedUser) => {
          const statusResult = await fetchFriendshipStatus(user.id, matchedUser.id);
          return {
            ...matchedUser,
            friendshipStatus: statusResult.status,
            requestId: statusResult.requestId,
          };
        })
      );

      setResults(usersWithStatus);
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setLoading(false);
    }
  };

  return { results, loading, search };
}

export function useSendFriendRequest() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (toUserId: string) => {
      if (!user) throw new Error("No user");

      await addDoc(collection(db, "friendRequests"), {
        fromUserId: user.id,
        toUserId,
        status: "pending",
        createdAt: serverTimestamp(),
      });
    },
    onSuccess: (_, toUserId) => {
      addToast("Friend request sent", "success");
      queryClient.invalidateQueries({
        queryKey: queryKeys.friendshipStatus(user!.id, toUserId),
      });
    },
    onError: () => {
      addToast("Error sending request", "error");
    },
  });
}

export function useAcceptFriendRequest() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      fromUserId,
    }: {
      requestId: string;
      fromUserId: string;
    }) => {
      if (!user) throw new Error("No user");

      // Update request
      await updateDoc(doc(db, "friendRequests", requestId), {
        status: "accepted",
      });

      // Create friendship with predictable ID
      const sortedIds = [user.id, fromUserId].sort() as [string, string];
      const friendshipId = `${sortedIds[0]}_${sortedIds[1]}`;
      await setDoc(doc(db, "friendships", friendshipId), {
        users: sortedIds,
        createdAt: serverTimestamp(),
      });

      return fromUserId;
    },
    onSuccess: (fromUserId) => {
      addToast("Request accepted", "success");
      queryClient.invalidateQueries({
        queryKey: queryKeys.friends.all(user!.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.friends.requests(user!.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.friendshipStatus(user!.id, fromUserId),
      });
    },
    onError: () => {
      addToast("Error accepting request", "error");
    },
  });
}

export function useRejectFriendRequest() {
  const { addToast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, fromUserId }: { requestId: string; fromUserId: string }) => {
      await updateDoc(doc(db, "friendRequests", requestId), {
        status: "rejected",
      });
      return fromUserId;
    },
    onSuccess: (fromUserId) => {
      addToast("Request rejected", "info");
      queryClient.invalidateQueries({
        queryKey: queryKeys.friends.requests(user!.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.friendshipStatus(user!.id, fromUserId),
      });
    },
    onError: () => {
      addToast("Error rejecting request", "error");
    },
  });
}

export function useCancelFriendRequest() {
  const { addToast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, toUserId }: { requestId: string; toUserId: string }) => {
      await deleteDoc(doc(db, "friendRequests", requestId));
      return toUserId;
    },
    onSuccess: (toUserId) => {
      addToast("Request cancelled", "info");
      queryClient.invalidateQueries({
        queryKey: queryKeys.friendshipStatus(user!.id, toUserId),
      });
    },
    onError: () => {
      addToast("Error cancelling request", "error");
    },
  });
}

export function useRemoveFriend() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (friendId: string) => {
      if (!user) throw new Error("No user");

      // Delete friendship using predictable ID
      const sortedIds = [user.id, friendId].sort();
      const friendshipId = `${sortedIds[0]}_${sortedIds[1]}`;
      await deleteDoc(doc(db, "friendships", friendshipId));
      return friendId;
    },
    onSuccess: (friendId) => {
      addToast("Friend removed", "info");
      queryClient.invalidateQueries({
        queryKey: queryKeys.friends.all(user!.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.friendshipStatus(user!.id, friendId),
      });
    },
    onError: () => {
      addToast("Error removing friend", "error");
    },
  });
}

export function useUserProfile(userId: string) {
  const { user: currentUser } = useAuth();

  return useQuery({
    queryKey: [...queryKeys.users.detail(userId), "profile"],
    queryFn: async (): Promise<UserWithFriendship | null> => {
      if (!currentUser) return null;

      const userData = await fetchUser(userId);
      if (!userData) return null;

      const statusResult = await fetchFriendshipStatus(currentUser.id, userId);

      return {
        ...userData,
        friendshipStatus: statusResult.status,
        requestId: statusResult.requestId,
      };
    },
    enabled: !!currentUser && !!userId,
    // Always refetch for friend profiles (fresh data)
    staleTime: 0,
    gcTime: 0,
  });
}
