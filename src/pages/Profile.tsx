import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PageContainer } from "@/components/layout/PageContainer";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { EditProfileSheet } from "@/components/profile/EditProfileSheet";
import { WishlistList } from "@/components/wishlist/WishlistList";
import { Button } from "@/components/ui/button";
import { ShareButton } from "@/components/ui/share-button";
import { LogOut } from "lucide-react";

export function ProfilePage() {
  const { user, logout } = useAuth();
  const [editOpen, setEditOpen] = useState(false);

  if (!user) return null;

  const shareUrl = `${window.location.origin}/u/${user.username}`;
  const shareTitle = user.firstName
    ? `${user.firstName}'s Wishlist`
    : `${user.username}'s Wishlist`;

  const header = (
    <div className="flex items-center justify-between p-4">
      <h1 className="text-lg font-semibold">My Profile</h1>
      <Button variant="ghost" size="icon" onClick={logout}>
        <LogOut className="w-5 h-5" />
      </Button>
    </div>
  );

  return (
    <PageContainer header={header} noPadding>
      {/* Share button - floating below header */}
      <div className="absolute top-24 right-4 z-10">
        <ShareButton url={shareUrl} title={shareTitle} variant="primary" />
      </div>

      <ProfileHeader user={user} onEdit={() => setEditOpen(true)} />

      <div className="px-4">
        <h2 className="text-lg font-semibold mb-4">My Wishlist</h2>
        <WishlistList userId={user.id} isOwner />
      </div>

      <EditProfileSheet
        user={user}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </PageContainer>
  );
}
