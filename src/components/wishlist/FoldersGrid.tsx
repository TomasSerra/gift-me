import { useState, useEffect } from "react";
import { useFolders, useCreateFolder } from "@/hooks/useFolders";
import { useWishlist } from "@/hooks/useWishlist";
import { FolderCard } from "./FolderCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { FolderPlus, Folder as FolderIcon } from "lucide-react";
import type { WishlistItem, Folder } from "@/types";

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
  const [sheetOpen, setSheetOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // Sync with external state
  useEffect(() => {
    if (startCreating && !sheetOpen) {
      setSheetOpen(true);
    }
  }, [startCreating, sheetOpen]);

  const handleSheetOpenChange = (open: boolean) => {
    setSheetOpen(open);
    onCreatingChange?.(open);
    if (!open) {
      setNewFolderName("");
    }
  };

  const loading = foldersLoading || itemsLoading;

  const getItemsForFolder = (folder: Folder): WishlistItem[] => {
    const folderItems = items.filter((item) => item.folderIds?.includes(folder.id));

    // Sort by folder's itemOrder if it exists
    if (folder.itemOrder && folder.itemOrder.length > 0) {
      const orderMap = new Map(folder.itemOrder.map((id, index) => [id, index]));
      folderItems.sort((a, b) => {
        const orderA = orderMap.get(a.id) ?? Infinity;
        const orderB = orderMap.get(b.id) ?? Infinity;
        return orderA - orderB;
      });
    }

    return folderItems.slice(0, 4);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await createFolder.mutateAsync(newFolderName.trim());
    setNewFolderName("");
    handleSheetOpenChange(false);
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

  if (folders.length === 0 && !isOwner) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <FolderIcon className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-foreground">No folders</h3>
        <p className="text-sm text-muted-foreground mt-1">
          This user hasn't created any folders yet
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Folders grid */}
      {folders.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {folders.map((folder) => (
            <FolderCard
              key={folder.id}
              folder={folder}
              items={getItemsForFolder(folder)}
            />
          ))}
        </div>
      ) : (
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

      {/* Create folder sheet */}
      <Sheet open={sheetOpen} onOpenChange={handleSheetOpenChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>New Folder</SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-4 mt-6">
            <Input
              label="Name *"
              placeholder="e.g. Birthday ideas"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreateFolder();
                }
              }}
              disabled={createFolder.isPending}
              autoFocus
            />

            <div className="pt-4">
              <Button
                className="w-full"
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim() || createFolder.isPending}
              >
                {createFolder.isPending ? (
                  <Spinner size="sm" className="text-white" />
                ) : (
                  "Create"
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
