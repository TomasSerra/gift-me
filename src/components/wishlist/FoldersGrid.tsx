import { useState } from "react";
import { useFolders, useCreateFolder } from "@/hooks/useFolders";
import { useWishlist } from "@/hooks/useWishlist";
import { FolderCard } from "./FolderCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, FolderPlus, Check, Folder } from "lucide-react";
import type { WishlistItem } from "@/types";

interface FoldersGridProps {
  userId: string;
  isOwner?: boolean;
  startCreating?: boolean;
  onCreatingChange?: (creating: boolean) => void;
}

export function FoldersGrid({
  userId,
  isOwner = false,
  startCreating = false,
  onCreatingChange,
}: FoldersGridProps) {
  const { folders, loading: foldersLoading } = useFolders(userId);
  const { items, loading: itemsLoading } = useWishlist(userId);
  const createFolder = useCreateFolder(userId);
  const [isCreating, setIsCreating] = useState(startCreating);
  const [newFolderName, setNewFolderName] = useState("");

  const handleSetIsCreating = (value: boolean) => {
    setIsCreating(value);
    onCreatingChange?.(value);
  };

  const loading = foldersLoading || itemsLoading;

  const getItemsForFolder = (folderId: string): WishlistItem[] => {
    return items
      .filter((item) => item.folderIds?.includes(folderId))
      .slice(0, 4);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await createFolder.mutateAsync(newFolderName.trim());
    setNewFolderName("");
    handleSetIsCreating(false);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="aspect-square w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (folders.length === 0 && !isOwner && !isCreating) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <Folder className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-foreground">No folders</h3>
        <p className="text-sm text-muted-foreground mt-1">
          This user hasn't created any folders yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Create folder input */}
      {isCreating && (
        <div className="flex gap-2">
          <Input
            placeholder="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreateFolder();
              }
            }}
            autoFocus
          />
          <Button
            size="icon"
            onClick={handleCreateFolder}
            disabled={!newFolderName.trim() || createFolder.isPending}
          >
            {createFolder.isPending ? (
              <Spinner size="sm" />
            ) : (
              <Check className="w-4 h-4" />
            )}
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={() => {
              handleSetIsCreating(false);
              setNewFolderName("");
            }}
          >
            <Plus className="w-4 h-4 rotate-45" />
          </Button>
        </div>
      )}

      {/* Folders grid */}
      {folders.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {folders.map((folder) => (
            <FolderCard
              key={folder.id}
              folder={folder}
              items={getItemsForFolder(folder.id)}
            />
          ))}
        </div>
      ) : (
        !isCreating &&
        isOwner && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <FolderPlus className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-foreground">No folders yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Tap "Add Folder" to create your first folder
            </p>
          </div>
        )
      )}
    </div>
  );
}
