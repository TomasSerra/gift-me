import { useActivityFeed } from "@/hooks/useActivityFeed";
import { ActivityCard } from "./ActivityCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Inbox, Users } from "lucide-react";
import { useFriends } from "@/hooks/useFriends";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function ActivityFeed() {
  const { activities, loading } = useActivityFeed();
  const { friends, loading: friendsLoading } = useFriends();
  const navigate = useNavigate();

  if (loading || friendsLoading) {
    return (
      <div className="space-y-4 px-4">
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
    <div className="space-y-3 px-4">
      <h2 className="font-semibold">Recent Activity</h2>
      {activities.map((activity) => (
        <ActivityCard key={activity.id} activity={activity} />
      ))}
    </div>
  );
}
