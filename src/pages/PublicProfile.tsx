import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { PageContainer } from "@/components/layout/PageContainer";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShareButton } from "@/components/ui/share-button";
import { WishlistList } from "@/components/wishlist/WishlistList";
import { ArrowLeft, UserPlus, LogIn } from "lucide-react";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import type { User } from "@/types";

export function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserByUsername = async () => {
      if (!username) return;

      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("username", "==", username), limit(1));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const userDoc = snapshot.docs[0];
          setProfileUser({ id: userDoc.id, ...userDoc.data() } as User);
        } else {
          setProfileUser(null);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        setProfileUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserByUsername();
  }, [username]);

  // If viewing own profile, redirect to /profile
  useEffect(() => {
    if (currentUser && profileUser && currentUser.id === profileUser.id) {
      navigate("/profile", { replace: true });
    }
  }, [currentUser, profileUser, navigate]);

  const shareUrl = `${window.location.origin}/u/${username}`;

  const header = (
    <div className="flex items-center gap-3 p-4">
      {currentUser ? (
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
          <UserPlus className="w-4 h-4 mr-1" />
          Sign up
        </Button>
      )}
      <h1 className="text-lg font-semibold flex-1">Profile</h1>
      {profileUser && (
        <ShareButton
          url={shareUrl}
          title={`${profileUser.firstName || profileUser.username}'s Wishlist`}
          variant="ghost"
        />
      )}
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

  if (!profileUser) {
    return (
      <PageContainer header={header}>
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">User not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/")}>
            Go Home
          </Button>
        </div>
      </PageContainer>
    );
  }

  const birthday = profileUser.birthday?.toDate();
  const displayName =
    profileUser.firstName || profileUser.lastName
      ? `${profileUser.firstName || ""} ${profileUser.lastName || ""}`.trim()
      : profileUser.username;

  return (
    <PageContainer header={header} noPadding>
      {/* Profile info */}
      <div className="flex flex-col items-center py-6">
        <Avatar
          id={profileUser.id}
          firstName={profileUser.firstName}
          lastName={profileUser.lastName}
          photoURL={profileUser.photoURL}
          size="xl"
        />

        <h1 className="mt-4 text-xl font-bold">{displayName}</h1>
        <p className="text-muted-foreground">@{profileUser.username}</p>

        {birthday && (
          <p className="text-sm text-muted-foreground mt-1">
            {format(birthday, "MMMM d", { locale: enUS })}
          </p>
        )}

        {/* CTA for non-logged users */}
        {!currentUser && (
          <Button className="mt-4" onClick={() => navigate("/auth")}>
            <LogIn className="w-4 h-4 mr-2" />
            Sign in to add friend
          </Button>
        )}

        {/* If logged in but not viewing own profile, show add friend */}
        {currentUser && currentUser.id !== profileUser.id && (
          <Button
            className="mt-4"
            onClick={() => navigate(`/friends/${profileUser.id}`)}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            View full profile
          </Button>
        )}
      </div>

      {/* Wishlist - visible to everyone */}
      <div className="px-4 pb-8">
        <WishlistList userId={profileUser.id} isOwner={false} />
      </div>
    </PageContainer>
  );
}
