import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  startAfter,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import { useInfiniteQuery } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useFriends } from "./useFriends";
import { queryKeys } from "@/lib/queryKeys";
import type { ActivityItem, User } from "@/types";

export interface ActivityWithUser extends ActivityItem {
  user: User;
}

interface ActivityPage {
  activities: ActivityWithUser[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
}

const ITEMS_PER_PAGE = 10;

async function fetchActivityPage(
  friendIds: string[],
  friends: User[],
  cursor: QueryDocumentSnapshot<DocumentData> | null
): Promise<ActivityPage> {
  // Firestore doesn't support "in" queries with more than 10 elements
  const limitedFriendIds = friendIds.slice(0, 10);

  let q = query(
    collection(db, "activity"),
    where("userId", "in", limitedFriendIds),
    orderBy("createdAt", "desc"),
    limit(ITEMS_PER_PAGE)
  );

  if (cursor) {
    q = query(
      collection(db, "activity"),
      where("userId", "in", limitedFriendIds),
      orderBy("createdAt", "desc"),
      startAfter(cursor),
      limit(ITEMS_PER_PAGE)
    );
  }

  const snapshot = await getDocs(q);

  const activities = snapshot.docs
    .map((activityDoc) => {
      const data = activityDoc.data() as ActivityItem;
      const friendData = friends.find((f) => f.id === data.userId);

      if (!friendData) return null;

      return {
        ...data,
        id: activityDoc.id,
        user: friendData,
      };
    })
    .filter((a): a is ActivityWithUser => a !== null);

  const lastDoc = snapshot.docs.length === ITEMS_PER_PAGE
    ? snapshot.docs[snapshot.docs.length - 1]
    : null;

  return { activities, lastDoc };
}

export function useActivityFeed() {
  const { user } = useAuth();
  const { friends, loading: friendsLoading } = useFriends();

  const friendIds = friends.map((f) => f.id);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: queryKeys.activity.feed(user?.id || ""),
    queryFn: ({ pageParam }) => fetchActivityPage(friendIds, friends, pageParam),
    getNextPageParam: (lastPage) => lastPage.lastDoc,
    initialPageParam: null as QueryDocumentSnapshot<DocumentData> | null,
    enabled: !!user && friends.length > 0,
  });

  const activities = data?.pages.flatMap((page) => page.activities) || [];
  const loading = isLoading || friendsLoading;

  return {
    activities,
    loading,
    fetchNextPage,
    hasNextPage: !!hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  };
}

export interface UpcomingBirthday {
  user: User;
  date: Date;
  daysUntil: number;
}

export function useUpcomingBirthdays() {
  const { friends } = useFriends();
  const [birthdays, setBirthdays] = useState<UpcomingBirthday[]>([]);

  useEffect(() => {
    const today = new Date();
    const currentYear = today.getFullYear();

    const upcoming = friends
      .filter((friend) => friend.birthday)
      .map((friend) => {
        const birthday = friend.birthday!.toDate();
        const thisYearBirthday = new Date(
          currentYear,
          birthday.getMonth(),
          birthday.getDate()
        );

        // If already passed this year, calculate for next year
        if (thisYearBirthday < today) {
          thisYearBirthday.setFullYear(currentYear + 1);
        }

        const diffTime = thisYearBirthday.getTime() - today.getTime();
        const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
          user: friend,
          date: thisYearBirthday,
          daysUntil,
        };
      })
      .filter((b) => b.daysUntil <= 30) // Only next 30 days
      .sort((a, b) => a.daysUntil - b.daysUntil);

    setBirthdays(upcoming);
  }, [friends]);

  return birthdays;
}
