import { useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { useActivityFeed } from "@/hooks/useActivityFeed";
import { ActivityCard } from "./ActivityCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Clock, Inbox, Users } from "lucide-react";
import { useFriends } from "@/hooks/useFriends";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface ActivityFeedProps {
  onRefetchReady?: (
    refetch: () => Promise<unknown>,
    isRefetching: boolean
  ) => void;
}

export function ActivityFeed({ onRefetchReady }: ActivityFeedProps) {
  const {
    activities,
    loading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useActivityFeed();
  const { friends, loading: friendsLoading } = useFriends();
  const navigate = useNavigate();

  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
  });

  // Expose refetch to parent
  useEffect(() => {
    onRefetchReady?.(refetch, isRefetching);
  }, [refetch, isRefetching, onRefetchReady]);

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (loading || friendsLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-40 mx-4" />
        {[1, 2].map((i) => (
          <div key={i} className="border-y">
            {/* Header */}
            <div className="flex items-center gap-3 p-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            {/* Image */}
            <Skeleton className="aspect-square w-full" />
            {/* Content */}
            <div className="p-3 space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // If user has no friends
  if (friends.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <Users className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-foreground">No friends yet</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          Add friends to see their activity
        </p>
        <Button onClick={() => navigate("/friends")}>Find Friends</Button>
      </div>
    );
  }

  // If user has friends but no activity
  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <Inbox className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-foreground">No recent activity</h3>
        <p className="text-sm text-muted-foreground mt-1">
          When your friends add items to their wishlist, they will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 px-4 mb-2">
        <Clock size={16} className="text-white" />
        <h2 className="font-semibold">Recent Activity</h2>
      </div>
      {activities.map((activity) => (
        <ActivityCard key={activity.id} activity={activity} />
      ))}

      {/* Load more trigger */}
      <div ref={loadMoreRef} className="py-4 flex justify-center">
        {isFetchingNextPage && <Spinner size="sm" />}
      </div>
    </div>
  );
}
