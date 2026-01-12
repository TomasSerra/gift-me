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
  getDoc,
  or,
} from "firebase/firestore";
import { useMutation } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/toast";
import type { User, FriendRequest, Friendship, UserWithFriendship } from "@/types";

export function useFriends() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "friendships"),
      or(
        where("users", "array-contains", user.id)
      )
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

      // Fetch user data for each friend
      const friendsData = await Promise.all(
        friendIds.map(async (id) => {
          const userDoc = await getDoc(doc(db, "users", id));
          if (userDoc.exists()) {
            return { id: userDoc.id, ...userDoc.data() } as User;
          }
          return null;
        })
      );

      setFriends(friendsData.filter((f): f is User => f !== null));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { friends, loading };
}

export function useFriendRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<(FriendRequest & { fromUser: User })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "friendRequests"),
      where("toUserId", "==", user.id),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const requestsData = await Promise.all(
        snapshot.docs.map(async (requestDoc) => {
          const data = requestDoc.data() as FriendRequest;
          const userDoc = await getDoc(doc(db, "users", data.fromUserId));
          const fromUser = userDoc.exists()
            ? ({ id: userDoc.id, ...userDoc.data() } as User)
            : null;

          if (!fromUser) return null;

          return {
            ...data,
            id: requestDoc.id,
            fromUser,
          };
        })
      );

      setRequests(
        requestsData.filter(
          (r): r is FriendRequest & { fromUser: User } => r !== null
        )
      );
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

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

      // Search by username
      const usersRef = collection(db, "users");
      const snapshot = await getDocs(usersRef);

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
        .map((doc) => ({ id: doc.id, ...doc.data() } as User));

      // Check friendship status for each user
      const usersWithStatus = await Promise.all(
        matchedUsers.map(async (matchedUser) => {
          // Check if already friends
          const friendshipQuery = query(
            collection(db, "friendships"),
            where("users", "array-contains", user.id)
          );
          const friendships = await getDocs(friendshipQuery);
          const isFriend = friendships.docs.some((doc) => {
            const data = doc.data() as Friendship;
            return data.users.includes(matchedUser.id);
          });

          if (isFriend) {
            return { ...matchedUser, friendshipStatus: "friends" as const };
          }

          // Verificar solicitudes pendientes
          const sentRequestQuery = query(
            collection(db, "friendRequests"),
            where("fromUserId", "==", user.id),
            where("toUserId", "==", matchedUser.id),
            where("status", "==", "pending")
          );
          const sentRequests = await getDocs(sentRequestQuery);

          if (!sentRequests.empty) {
            return {
              ...matchedUser,
              friendshipStatus: "pending_sent" as const,
              requestId: sentRequests.docs[0].id,
            };
          }

          const receivedRequestQuery = query(
            collection(db, "friendRequests"),
            where("fromUserId", "==", matchedUser.id),
            where("toUserId", "==", user.id),
            where("status", "==", "pending")
          );
          const receivedRequests = await getDocs(receivedRequestQuery);

          if (!receivedRequests.empty) {
            return {
              ...matchedUser,
              friendshipStatus: "pending_received" as const,
              requestId: receivedRequests.docs[0].id,
            };
          }

          return { ...matchedUser, friendshipStatus: "none" as const };
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
    onSuccess: () => {
      addToast("Friend request sent", "success");
    },
    onError: () => {
      addToast("Error sending request", "error");
    },
  });
}

export function useAcceptFriendRequest() {
  const { user } = useAuth();
  const { addToast } = useToast();

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

      // Create friendship with predictable ID for security rules
      const sortedIds = [user.id, fromUserId].sort() as [string, string];
      const friendshipId = `${sortedIds[0]}_${sortedIds[1]}`;
      await setDoc(doc(db, "friendships", friendshipId), {
        users: sortedIds,
        createdAt: serverTimestamp(),
      });
    },
    onSuccess: () => {
      addToast("Request accepted", "success");
    },
    onError: () => {
      addToast("Error accepting request", "error");
    },
  });
}

export function useRejectFriendRequest() {
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async (requestId: string) => {
      await updateDoc(doc(db, "friendRequests", requestId), {
        status: "rejected",
      });
    },
    onSuccess: () => {
      addToast("Request rejected", "info");
    },
    onError: () => {
      addToast("Error rejecting request", "error");
    },
  });
}

export function useCancelFriendRequest() {
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async (requestId: string) => {
      await deleteDoc(doc(db, "friendRequests", requestId));
    },
    onSuccess: () => {
      addToast("Request cancelled", "info");
    },
    onError: () => {
      addToast("Error cancelling request", "error");
    },
  });
}

export function useRemoveFriend() {
  const { user } = useAuth();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async (friendId: string) => {
      if (!user) throw new Error("No user");

      // Delete friendship using predictable ID
      const sortedIds = [user.id, friendId].sort();
      const friendshipId = `${sortedIds[0]}_${sortedIds[1]}`;
      await deleteDoc(doc(db, "friendships", friendshipId));
    },
    onSuccess: () => {
      addToast("Friend removed", "info");
    },
    onError: () => {
      addToast("Error removing friend", "error");
    },
  });
}

export function useUserProfile(userId: string) {
  const { user: currentUser } = useAuth();
  const [userData, setUserData] = useState<UserWithFriendship | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser || !userId) return;

    const fetchUser = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (!userDoc.exists()) {
          setUserData(null);
          setLoading(false);
          return;
        }

        const userData = { id: userDoc.id, ...userDoc.data() } as User;

        // Check friendship status
        const friendshipQuery = query(
          collection(db, "friendships"),
          where("users", "array-contains", currentUser.id)
        );
        const friendships = await getDocs(friendshipQuery);
        const isFriend = friendships.docs.some((doc) => {
          const data = doc.data() as Friendship;
          return data.users.includes(userId);
        });

        if (isFriend) {
          setUserData({ ...userData, friendshipStatus: "friends" });
        } else {
          // Check pending requests
          const sentRequestQuery = query(
            collection(db, "friendRequests"),
            where("fromUserId", "==", currentUser.id),
            where("toUserId", "==", userId),
            where("status", "==", "pending")
          );
          const sentRequests = await getDocs(sentRequestQuery);

          if (!sentRequests.empty) {
            setUserData({
              ...userData,
              friendshipStatus: "pending_sent",
              requestId: sentRequests.docs[0].id,
            });
          } else {
            const receivedRequestQuery = query(
              collection(db, "friendRequests"),
              where("fromUserId", "==", userId),
              where("toUserId", "==", currentUser.id),
              where("status", "==", "pending")
            );
            const receivedRequests = await getDocs(receivedRequestQuery);

            if (!receivedRequests.empty) {
              setUserData({
                ...userData,
                friendshipStatus: "pending_received",
                requestId: receivedRequests.docs[0].id,
              });
            } else {
              setUserData({ ...userData, friendshipStatus: "none" });
            }
          }
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [currentUser, userId]);

  return { user: userData, loading };
}
