import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  useFriendRequests,
  useAcceptFriendRequest,
  useRejectFriendRequest,
} from "@/hooks/useFriends";
import { Check, X, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function FriendRequests() {
  const { requests, loading } = useFriendRequests();
  const acceptRequest = useAcceptFriendRequest();
  const rejectRequest = useRejectFriendRequest();
  const navigate = useNavigate();

  // Track requests that have been handled optimistically
  const [handledRequestIds, setHandledRequestIds] = useState<Set<string>>(new Set());

  const handleAccept = (requestId: string, fromUserId: string) => {
    // Optimistically remove from list
    setHandledRequestIds((prev) => new Set(prev).add(requestId));

    acceptRequest.mutate(
      { requestId, fromUserId },
      {
        onError: () => {
          // Revert on error
          setHandledRequestIds((prev) => {
            const next = new Set(prev);
            next.delete(requestId);
            return next;
          });
        },
      }
    );
  };

  const handleReject = (requestId: string, fromUserId: string) => {
    // Optimistically remove from list
    setHandledRequestIds((prev) => new Set(prev).add(requestId));

    rejectRequest.mutate({ requestId, fromUserId }, {
      onError: () => {
        // Revert on error
        setHandledRequestIds((prev) => {
          const next = new Set(prev);
          next.delete(requestId);
          return next;
        });
      },
    });
  };

  // Filter out handled requests
  const visibleRequests = requests.filter((r) => !handledRequestIds.has(r.id));

  if (loading || visibleRequests.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <UserPlus className="w-5 h-5 text-primary" />
        <h2 className="font-semibold">Friend Requests</h2>
        <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
          {visibleRequests.length}
        </span>
      </div>

      <div className="space-y-2">
        {visibleRequests.map((request) => (
          <Card key={request.id}>
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                  onClick={() => navigate(`/friends/${request.fromUserId}`)}
                >
                  <Avatar
                    id={request.fromUser.id}
                    firstName={request.fromUser.firstName}
                    lastName={request.fromUser.lastName}
                    photoURL={request.fromUser.photoURL}
                  />
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {request.fromUser.firstName || request.fromUser.lastName
                        ? `${request.fromUser.firstName || ""} ${request.fromUser.lastName || ""}`.trim()
                        : request.fromUser.username}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      @{request.fromUser.username}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="icon"
                    onClick={() => handleAccept(request.id, request.fromUserId)}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleReject(request.id, request.fromUserId)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
