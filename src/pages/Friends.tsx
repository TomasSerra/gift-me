import { useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { SearchUsers } from "@/components/friends/SearchUsers";
import { FriendRequests } from "@/components/friends/FriendRequests";
import { FriendsList } from "@/components/friends/FriendsList";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Search, UserPlus } from "lucide-react";

export function FriendsPage() {
  const [searchFilter, setSearchFilter] = useState("");
  const [addFriendOpen, setAddFriendOpen] = useState(false);

  const header = (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Friends</h1>
        <Button size="sm" onClick={() => setAddFriendOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Add Friend
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search friends..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          className="pl-9"
        />
      </div>
    </div>
  );

  return (
    <PageContainer header={header}>
      <div className="space-y-6">
        <FriendRequests />
        <FriendsList filter={searchFilter} />
      </div>

      <Sheet open={addFriendOpen} onOpenChange={setAddFriendOpen}>
        <SheetContent className="h-[90vh] flex flex-col">
          <SheetHeader className="shrink-0">
            <SheetTitle>Add Friend</SheetTitle>
          </SheetHeader>
          <div className="mt-6 flex-1 overflow-y-auto -mx-6 px-6">
            <SearchUsers autoFocus />
          </div>
        </SheetContent>
      </Sheet>
    </PageContainer>
  );
}
