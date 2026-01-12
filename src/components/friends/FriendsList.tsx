import { useMemo } from "react";
import { useFriends } from "@/hooks/useFriends";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FriendsListProps {
  filter?: string;
}

export function FriendsList({ filter = "" }: FriendsListProps) {
  const { friends, loading } = useFriends();
  const navigate = useNavigate();

  // Filter friends based on search term
  const filteredFriends = useMemo(() => {
    if (!filter.trim()) return friends;

    const searchLower = filter.toLowerCase();
    return friends.filter((friend) => {
      const firstName = (friend.firstName || "").toLowerCase();
      const lastName = (friend.lastName || "").toLowerCase();
      const username = friend.username.toLowerCase();
      const fullName = `${firstName} ${lastName}`.trim();

      return (
        firstName.includes(searchLower) ||
        lastName.includes(searchLower) ||
        username.includes(searchLower) ||
        fullName.includes(searchLower)
      );
    });
  }, [friends, filter]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <Users className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-foreground">No friends yet</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Add friends to see them here
        </p>
      </div>
    );
  }

  if (filteredFriends.length === 0 && filter) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No friends match "{filter}"</p>
      </div>
    );
  }

  // Group by first letter of name/username
  const grouped = filteredFriends.reduce(
    (acc, friend) => {
      const name =
        friend.firstName || friend.lastName
          ? `${friend.firstName || ""} ${friend.lastName || ""}`.trim()
          : friend.username;
      const letter = name.charAt(0).toUpperCase();

      if (!acc[letter]) {
        acc[letter] = [];
      }
      acc[letter].push(friend);
      return acc;
    },
    {} as Record<string, typeof filteredFriends>
  );

  const sortedLetters = Object.keys(grouped).sort();

  return (
    <div className="space-y-4">
      {sortedLetters.map((letter) => (
        <div key={letter}>
          <p className="text-sm font-semibold text-muted-foreground mb-2 px-1">
            {letter}
          </p>
          <div className="space-y-1">
            {grouped[letter].map((friend) => (
              <Card
                key={friend.id}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => navigate(`/friends/${friend.id}`)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <Avatar
                      id={friend.id}
                      firstName={friend.firstName}
                      lastName={friend.lastName}
                      photoURL={friend.photoURL}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {friend.firstName || friend.lastName
                          ? `${friend.firstName || ""} ${friend.lastName || ""}`.trim()
                          : friend.username}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        @{friend.username}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
