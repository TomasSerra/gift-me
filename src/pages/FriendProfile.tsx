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
  Cake,
} from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useState } from "react";
import type { UserWithFriendship } from "@/types";

type FriendshipStatus = UserWithFriendship["friendshipStatus"];

export function FriendProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { data: user, isLoading: loading } = useUserProfile(userId || "");
  const sendRequest = useSendFriendRequest();
  const cancelRequest = useCancelFriendRequest();
  const acceptRequest = useAcceptFriendRequest();
  const removeFriend = useRemoveFriend();
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);

  // Optimistic state for friendship status
  const [optimisticStatus, setOptimisticStatus] =
    useState<FriendshipStatus | null>(null);
  const [prevFriendshipStatus, setPrevFriendshipStatus] = useState(
    user?.friendshipStatus
  );

  // Reset optimistic state when server status changes (React pattern for syncing state with props)
  if (user?.friendshipStatus !== prevFriendshipStatus) {
    setPrevFriendshipStatus(user?.friendshipStatus);
    setOptimisticStatus(null);
  }

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
      <PageContainer header={header} noPadding>
        {/* Profile header skeleton */}
        <div className="flex items-start gap-4 px-4 py-6">
          <Skeleton className="w-20 h-20 rounded-full flex-shrink-0" />
          <div className="flex flex-col items-start gap-2">
            <Skeleton className="w-32 h-6" />
            <Skeleton className="w-24 h-4" />
            <Skeleton className="w-28 h-9 mt-1 rounded-md" />
          </div>
        </div>
        {/* Tabs skeleton */}
        <div className="px-4">
          <Skeleton className="w-full h-11 rounded-full" />
        </div>
        {/* Products grid skeleton */}
        <div className="px-4 mt-4 grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-xl" />
          ))}
        </div>
      </PageContainer>
    );
  }

  if (!user) {
    return (
      <PageContainer header={header}>
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">User not found</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate(-1)}
          >
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
    if (user?.requestId) {
      cancelRequest.mutate(
        { requestId: user.requestId, toUserId: user.id },
        {
          onError: () => setOptimisticStatus(null),
        }
      );
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
    if (user?.requestId) {
      cancelRequest.mutate(
        { requestId: user.requestId, toUserId: user.id },
        {
          onError: () => setOptimisticStatus(null),
        }
      );
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
            className="mt-3"
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
            className="mt-3"
            onClick={handleCancelRequest}
          >
            <Clock className="w-4 h-4 mr-2" />
            Cancel Request
          </Button>
        );
      case "pending_received":
        return (
          <div className="flex gap-2 mt-3">
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
          <Button className="mt-3" onClick={handleSendRequest}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add Friend
          </Button>
        );
    }
  };

  return (
    <PageContainer header={header} noPadding>
      <div className="flex items-start gap-4 px-4 py-6">
        {/* Avatar */}
        <Avatar
          id={user.id}
          firstName={user.firstName}
          lastName={user.lastName}
          photoURL={user.photoURL}
          size="xl"
        />

        {/* Info */}
        <div className="flex flex-col items-start min-w-0">
          <h1 className="text-xl font-bold">
            {user.firstName || user.lastName
              ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
              : user.username}
          </h1>

          <p className="text-muted-foreground">@{user.username}</p>

          {birthday && (
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
              <Cake className="w-4 h-4" />
              {format(birthday, "MMMM d")}
            </p>
          )}

          {renderActionButton()}
        </div>
      </div>

      {/* Wishlist visible to everyone */}
      <div className="px-4">
        <WishlistList userId={user.id} isOwner={false} isFriend={effectiveStatus === "friends"} />
      </div>

      {/* Remove friend dialog */}
      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Friend</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {user.firstName || user.username}{" "}
              from your friends?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemoveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemoveFriend}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
