import { useParams, useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WishlistList } from "@/components/wishlist/WishlistList";
import {
  useUserProfile,
  useSendFriendRequest,
  useCancelFriendRequest,
  useAcceptFriendRequest,
  useRemoveFriend,
} from "@/hooks/useFriends";
import {
  ArrowLeft,
  UserPlus,
  UserMinus,
  Clock,
  Check,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import type { UserWithFriendship } from "@/types";

type FriendshipStatus = UserWithFriendship["friendshipStatus"];

export function FriendProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user, loading } = useUserProfile(userId || "");
  const sendRequest = useSendFriendRequest();
  const cancelRequest = useCancelFriendRequest();
  const acceptRequest = useAcceptFriendRequest();
  const removeFriend = useRemoveFriend();
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);

  // Optimistic state for friendship status
  const [optimisticStatus, setOptimisticStatus] = useState<FriendshipStatus | null>(null);

  // Reset optimistic state when user data changes
  useEffect(() => {
    setOptimisticStatus(null);
  }, [user?.friendshipStatus]);

  const effectiveStatus = optimisticStatus ?? user?.friendshipStatus ?? "none";

  const header = (
    <div className="flex items-center gap-3 p-4">
      <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
        <ArrowLeft className="w-5 h-5" />
      </Button>
      <h1 className="text-lg font-semibold">Profile</h1>
    </div>
  );

  if (loading) {
    return (
      <PageContainer header={header}>
        <div className="flex flex-col items-center py-6">
          <Skeleton className="w-20 h-20 rounded-full" />
          <Skeleton className="w-32 h-6 mt-4" />
          <Skeleton className="w-24 h-4 mt-2" />
        </div>
      </PageContainer>
    );
  }

  if (!user) {
    return (
      <PageContainer header={header}>
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">User not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </div>
      </PageContainer>
    );
  }

  const birthday = user.birthday?.toDate();

  const handleSendRequest = () => {
    setOptimisticStatus("pending_sent");
    sendRequest.mutate(user.id, {
      onError: () => setOptimisticStatus(null),
    });
  };

  const handleCancelRequest = () => {
    setOptimisticStatus("none");
    if (user.requestId) {
      cancelRequest.mutate(user.requestId, {
        onError: () => setOptimisticStatus(null),
      });
    }
  };

  const handleAcceptRequest = () => {
    setOptimisticStatus("friends");
    if (user.requestId) {
      acceptRequest.mutate(
        { requestId: user.requestId, fromUserId: user.id },
        { onError: () => setOptimisticStatus(null) }
      );
    }
  };

  const handleRejectRequest = () => {
    setOptimisticStatus("none");
    if (user.requestId) {
      cancelRequest.mutate(user.requestId, {
        onError: () => setOptimisticStatus(null),
      });
    }
  };

  const handleRemoveFriend = () => {
    setOptimisticStatus("none");
    setRemoveDialogOpen(false);
    removeFriend.mutate(user.id, {
      onError: () => setOptimisticStatus(null),
    });
  };

  const renderActionButton = () => {
    switch (effectiveStatus) {
      case "friends":
        return (
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setRemoveDialogOpen(true)}
          >
            <UserMinus className="w-4 h-4 mr-2" />
            Remove Friend
          </Button>
        );
      case "pending_sent":
        return (
          <Button
            variant="outline"
            className="mt-4"
            onClick={handleCancelRequest}
          >
            <Clock className="w-4 h-4 mr-2" />
            Cancel Request
          </Button>
        );
      case "pending_received":
        return (
          <div className="flex gap-2 mt-4">
            <Button onClick={handleAcceptRequest}>
              <Check className="w-4 h-4 mr-2" />
              Accept
            </Button>
            <Button variant="outline" onClick={handleRejectRequest}>
              <X className="w-4 h-4 mr-2" />
              Reject
            </Button>
          </div>
        );
      default:
        return (
          <Button className="mt-4" onClick={handleSendRequest}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add Friend
          </Button>
        );
    }
  };

  return (
    <PageContainer header={header} noPadding>
      <div className="flex flex-col items-center py-6">
        <Avatar
          id={user.id}
          firstName={user.firstName}
          lastName={user.lastName}
          photoURL={user.photoURL}
          size="xl"
        />

        <h1 className="mt-4 text-xl font-bold">
          {user.firstName || user.lastName
            ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
            : user.username}
        </h1>

        <p className="text-muted-foreground">@{user.username}</p>

        {birthday && (
          <p className="text-sm text-muted-foreground mt-1">
            {format(birthday, "MMMM d", { locale: enUS })}
          </p>
        )}

        {renderActionButton()}
      </div>

      {/* Wishlist only visible if friends */}
      {effectiveStatus === "friends" ? (
        <div className="px-4">
          <h2 className="text-lg font-semibold mb-4">Wishlist</h2>
          <WishlistList userId={user.id} isOwner={false} />
        </div>
      ) : (
        <div className="px-4 py-8 text-center">
          <p className="text-muted-foreground">
            Add {user.firstName || user.username} as a friend to see their
            wishlist
          </p>
        </div>
      )}

      {/* Remove friend dialog */}
      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Friend</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              {user.firstName || user.username} from your friends?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemoveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveFriend}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
