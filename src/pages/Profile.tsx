import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PageContainer } from "@/components/layout/PageContainer";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { EditProfileSheet } from "@/components/profile/EditProfileSheet";
import { WishlistList } from "@/components/wishlist/WishlistList";
import { WishlistForm } from "@/components/wishlist/WishlistForm";
import { Button } from "@/components/ui/button";
import { ShareButton } from "@/components/ui/share-button";
import type { WishlistItem } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProfilePage() {
  const { user, logout } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [wishlistFormOpen, setWishlistFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const handleOpenForm = (item?: WishlistItem) => {
    setEditingItem(item || null);
    setWishlistFormOpen(true);
  };

  const handleCloseForm = (open: boolean) => {
    if (!open) {
      setWishlistFormOpen(false);
      setTimeout(() => setEditingItem(null), 350);
    }
  };

  if (!user) return null;

  const shareUrl = `${window.location.origin}/u/${user.username}`;
  const shareTitle = user.firstName
    ? `${user.firstName}'s Wishlist`
    : `${user.username}'s Wishlist`;

  const header = (
    <div className="flex items-center justify-between p-4">
      <h1 className="text-lg font-semibold">My Profile</h1>
      <Button variant="ghost" size="icon" onClick={() => setLogoutDialogOpen(true)}>
        <LogOut className="w-5 h-5" />
      </Button>
    </div>
  );

  return (
    <PageContainer header={header} noPadding>
      <div className={cn(editOpen && "invisible")}>
        {/* Share button - floating below header */}
        <div className="absolute top-24 safe-area-top right-4 z-10">
          <ShareButton url={shareUrl} title={shareTitle} variant="primary" />
        </div>

        <ProfileHeader user={user} onEdit={() => setEditOpen(true)} />

        <div className="px-4">
          <WishlistList userId={user.id} isOwner onOpenForm={handleOpenForm} hideContent={wishlistFormOpen} />
        </div>
      </div>

      <EditProfileSheet
        user={user}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <WishlistForm
        userId={user.id}
        open={wishlistFormOpen}
        onOpenChange={handleCloseForm}
        editItem={editingItem}
      />

      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log out</DialogTitle>
            <DialogDescription>
              Are you sure you want to log out of your account?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogoutDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={logout}>
              Log out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
