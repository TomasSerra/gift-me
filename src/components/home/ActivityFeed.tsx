import { useEffect, useState, useRef, useCallback } from "react";
import { useInView } from "react-intersection-observer";
import { useActivityFeed } from "@/hooks/useActivityFeed";
import { ActivityCard } from "./ActivityCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Inbox, Users, RefreshCw } from "lucide-react";
import { useFriends } from "@/hooks/useFriends";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const PULL_THRESHOLD = 80;

export function ActivityFeed() {
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

  // Pull-to-refresh state
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isPulling || window.scrollY > 0) {
        setPullDistance(0);
        return;
      }

      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;

      if (diff > 0) {
        // Apply resistance to pull
        const resistance = 0.4;
        setPullDistance(Math.min(diff * resistance, PULL_THRESHOLD * 1.5));
      }
    },
    [isPulling]
  );

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= PULL_THRESHOLD && !isRefetching) {
      await refetch();
    }
    setPullDistance(0);
    setIsPulling(false);
  }, [pullDistance, isRefetching, refetch]);

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (loading || friendsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
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
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="flex flex-col gap-2"
    >
      {/* Pull-to-refresh indicator */}
      <div
        className="flex justify-center items-center overflow-hidden transition-all duration-200"
        style={{ height: isRefetching ? 48 : pullDistance }}
      >
        <RefreshCw
          className={cn(
            "w-6 h-6 text-muted-foreground transition-transform",
            isRefetching && "animate-spin",
            pullDistance >= PULL_THRESHOLD && "text-primary"
          )}
          style={{
            transform: `rotate(${Math.min(pullDistance * 2, 180)}deg)`,
          }}
        />
      </div>

      <h2 className="font-semibold px-4 mb-3">Recent Activity</h2>
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
