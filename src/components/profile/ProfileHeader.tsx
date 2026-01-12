import { useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Settings, Cake, Pencil } from "lucide-react";
import type { User } from "@/types";
import { format } from "date-fns";
import { uploadProfilePhoto } from "@/lib/storage";
import { useUpdateUser } from "@/hooks/useUser";

interface ProfileHeaderProps {
  user: User;
  onEdit: () => void;
  isOwnProfile?: boolean;
}

export function ProfileHeader({
  user,
  onEdit,
  isOwnProfile = true,
}: ProfileHeaderProps) {
  const birthday = user.birthday?.toDate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const updateUser = useUpdateUser();

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const photoURL = await uploadProfilePhoto(user.id, file);
      await updateUser.mutateAsync({ photoURL });
    } catch (error) {
      console.error("Error uploading photo:", error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="flex flex-col items-center py-6">
      <div className="relative">
        <Avatar
          id={user.id}
          firstName={user.firstName}
          lastName={user.lastName}
          photoURL={user.photoURL}
          size="xl"
        />
        {isUploading && (
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
            <Spinner className="text-white" />
          </div>
        )}
        {isOwnProfile && (
          <>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1.5 shadow-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />
          </>
        )}
      </div>

      <h1 className="mt-4 text-xl font-bold">
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

      {isOwnProfile && (
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={onEdit}
        >
          <Settings className="w-4 h-4 mr-2" />
          Edit Profile
        </Button>
      )}
    </div>
  );
}
