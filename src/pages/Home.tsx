import { useState, useRef, useCallback } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { EventCarousel } from "@/components/home/EventCarousel";
import { ActivityFeed } from "@/components/home/ActivityFeed";
import { WishlistForm } from "@/components/wishlist/WishlistForm";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const PULL_THRESHOLD = 80;

export function HomePage() {
  const { user } = useAuth();
  const [formOpen, setFormOpen] = useState(false);

  // Pull-to-refresh state
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);
  const startY = useRef(0);
  const refetchRef = useRef<(() => Promise<unknown>) | null>(null);

  const handleRefetchReady = useCallback(
    (refetch: () => Promise<unknown>, refetching: boolean) => {
      refetchRef.current = refetch;
      setIsRefetching(refetching);
    },
    []
  );

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
    if (pullDistance >= PULL_THRESHOLD && !isRefetching && refetchRef.current) {
      await refetchRef.current();
    }
    setPullDistance(0);
    setIsPulling(false);
  }, [pullDistance, isRefetching]);

  const header = (
    <div className="flex items-center gap-3 p-4">
      <img src="/logo.png" alt="GiftMe" className="w-10 h-10" />
      <div>
        <h1 className="text-lg font-semibold">GiftMe</h1>
        <p className="text-xs text-muted-foreground">
          Hello, {user?.firstName || user?.username}
        </p>
      </div>
    </div>
  );

  return (
    <PageContainer header={header} noPadding>
      <div
        className="space-y-6 py-4"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Pull-to-refresh indicator */}
        <div
          className="flex justify-center items-center overflow-hidden transition-all duration-200 -mt-4"
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

        <EventCarousel />
        <ActivityFeed onRefetchReady={handleRefetchReady} />
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setFormOpen(true)}
        className="fixed right-4 bottom-32 z-40 w-16 h-16 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 active:scale-90 transition-transform duration-150"
      >
        <Plus className="w-7 h-7" strokeWidth={2.5} />
      </button>

      {user && (
        <WishlistForm
          userId={user.id}
          open={formOpen}
          onOpenChange={setFormOpen}
        />
      )}
    </PageContainer>
  );
}
