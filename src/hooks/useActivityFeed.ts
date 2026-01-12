import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useFriends } from "./useFriends";
import { queryKeys } from "@/lib/queryKeys";
import type { ActivityItem, User } from "@/types";

export interface ActivityWithUser extends ActivityItem {
  user: User;
}

export function useActivityFeed() {
  const { user } = useAuth();
  const { friends } = useFriends();
  const queryClient = useQueryClient();

  // Check for cached data to avoid showing loader on re-mount
  const cachedActivities = queryClient.getQueryData<ActivityWithUser[]>(
    queryKeys.activity.feed(user?.id || "")
  );

  const [activities, setActivities] = useState<ActivityWithUser[]>(cachedActivities || []);
  const [loading, setLoading] = useState(!cachedActivities);

  useEffect(() => {
    if (!user || friends.length === 0) {
      setActivities([]);
      setLoading(false);
      return;
    }

    const friendIds = friends.map((f) => f.id);

    // Firestore doesn't support "in" queries with more than 10 elements
    // For simplicity, we limit to the first 10 friends
    const limitedFriendIds = friendIds.slice(0, 10);

    const q = query(
      collection(db, "activity"),
      where("userId", "in", limitedFriendIds),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const activitiesData = await Promise.all(
        snapshot.docs.map(async (activityDoc) => {
          const data = activityDoc.data() as ActivityItem;
          const friendData = friends.find((f) => f.id === data.userId);

          if (!friendData) return null;

          return {
            ...data,
            id: activityDoc.id,
            user: friendData,
          };
        })
      );

      const filteredActivities = activitiesData.filter((a): a is ActivityWithUser => a !== null);
      setActivities(filteredActivities);
      setLoading(false);

      // Update cache for next mount
      queryClient.setQueryData(queryKeys.activity.feed(user.id), filteredActivities);
    });

    return () => unsubscribe();
  }, [user, friends, queryClient]);

  return { activities, loading };
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
