import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent } from "@/components/ui/card";
import {
  useSearchUsers,
  useSendFriendRequest,
  useCancelFriendRequest,
  useAcceptFriendRequest,
} from "@/hooks/useFriends";
import { Search, UserPlus, Clock, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { UserWithFriendship } from "@/types";

interface SearchUsersProps {
  autoFocus?: boolean;
}

export function SearchUsers({ autoFocus = false }: SearchUsersProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingSentIds, setPendingSentIds] = useState<Set<string>>(new Set());
  const { results, loading, search } = useSearchUsers();
  const sendRequest = useSendFriendRequest();
  const cancelRequest = useCancelFriendRequest();
  const acceptRequest = useAcceptFriendRequest();
  const navigate = useNavigate();

  useEffect(() => {
    const debounce = setTimeout(() => {
      search(searchTerm);
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchTerm]);

  const handleSendRequest = (userId: string) => {
    // Optimistic update - immediately show as pending
    setPendingSentIds((prev) => new Set(prev).add(userId));

    sendRequest.mutate(userId, {
      onError: () => {
        // Revert on error
        setPendingSentIds((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      },
    });
  };

  const getEffectiveStatus = (user: UserWithFriendship) => {
    if (pendingSentIds.has(user.id)) {
      return "pending_sent";
    }
    return user.friendshipStatus;
  };

  const renderActionButton = (user: UserWithFriendship) => {
    const status = getEffectiveStatus(user);

    switch (status) {
      case "friends":
        return (
          <Button variant="secondary" size="sm" disabled>
            <Check className="w-4 h-4 mr-1" />
            Friends
          </Button>
        );
      case "pending_sent":
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              if (user.requestId) {
                cancelRequest.mutate(user.requestId);
                setPendingSentIds((prev) => {
                  const next = new Set(prev);
                  next.delete(user.id);
                  return next;
                });
              }
            }}
            disabled={cancelRequest.isPending}
          >
            <Clock className="w-4 h-4 mr-1" />
            Pending
          </Button>
        );
      case "pending_received":
        return (
          <div className="flex gap-1">
            <Button
              variant="default"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                if (user.requestId) {
                  acceptRequest.mutate({
                    requestId: user.requestId,
                    fromUserId: user.id,
                  });
                }
              }}
              disabled={acceptRequest.isPending}
            >
              <Check className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                if (user.requestId) {
                  cancelRequest.mutate(user.requestId);
                }
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        );
      default:
        return (
          <Button
            variant="default"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleSendRequest(user.id);
            }}
            disabled={sendRequest.isPending && pendingSentIds.has(user.id)}
          >
            <UserPlus className="w-4 h-4 mr-1" />
            Add
          </Button>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative pt-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Search by name or username..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
          autoFocus={autoFocus}
        />
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      )}

      {!loading && searchTerm.length >= 2 && results.length === 0 && (
        <p className="text-center text-muted-foreground py-8">No users found</p>
      )}

      {!loading && searchTerm.length < 2 && (
        <p className="text-center text-muted-foreground py-8">
          Type at least 2 characters to search
        </p>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-2">
          {results.map((user) => (
            <Card
              key={user.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => navigate(`/friends/${user.id}`)}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <Avatar
                    id={user.id}
                    firstName={user.firstName}
                    lastName={user.lastName}
                    photoURL={user.photoURL}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {user.firstName || user.lastName
                        ? `${user.firstName || ""} ${
                            user.lastName || ""
                          }`.trim()
                        : user.username}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      @{user.username}
                    </p>
                  </div>
                  {renderActionButton(user)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
