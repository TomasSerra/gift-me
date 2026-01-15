import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useFolders, useCreateFolder } from "@/hooks/useFolders";
import { Plus, Check, FolderPlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface FolderPickerProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFolderIds: string[];
  onSelectionChange: (folderIds: string[]) => void;
}

export function FolderPicker({
  userId,
  open,
  onOpenChange,
  selectedFolderIds,
  onSelectionChange,
}: FolderPickerProps) {
  const { folders, loading } = useFolders(userId);
  const createFolder = useCreateFolder(userId);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleToggleFolder = (folderId: string) => {
    if (selectedFolderIds.includes(folderId)) {
      onSelectionChange(selectedFolderIds.filter((id) => id !== folderId));
    } else {
      onSelectionChange([...selectedFolderIds, folderId]);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    const folderId = await createFolder.mutateAsync(newFolderName.trim());
    onSelectionChange([...selectedFolderIds, folderId]);
    setNewFolderName("");
    setIsCreating(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Select Folders</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Create new folder */}
          {isCreating ? (
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
                  setIsCreating(false);
                  setNewFolderName("");
                }}
              >
                <Plus className="w-4 h-4 rotate-45" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setIsCreating(true)}
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              Create new folder
            </Button>
          )}

          {/* Folders list */}
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : folders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No folders yet. Create your first folder above.
            </p>
          ) : (
            <div className="space-y-2">
              {folders.map((folder) => {
                const isSelected = selectedFolderIds.includes(folder.id);
                return (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => handleToggleFolder(folder.id)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-lg border transition-colors",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted"
                    )}
                  >
                    <span className="font-medium">{folder.name}</span>
                    {isSelected && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Done button */}
          <Button className="w-full mt-4" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
