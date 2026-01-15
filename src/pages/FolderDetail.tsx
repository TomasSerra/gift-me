import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, onSnapshot, query, collection, where } from "firebase/firestore";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useDeleteFolder, useUpdateFolder, useReorderFolderItems } from "@/hooks/useFolders";
import { useUserById } from "@/hooks/useUserById";
import { PageContainer } from "@/components/layout/PageContainer";
import { Avatar } from "@/components/ui/avatar";
import { WishlistGridItem } from "@/components/wishlist/WishlistGridItem";
import { WishlistForm } from "@/components/wishlist/WishlistForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverItem,
} from "@/components/ui/popover";
import { ShareButton } from "@/components/ui/share-button";
import {
  ArrowLeft,
  MoreVertical,
  Pencil,
  Trash2,
  FolderOpen,
  Check,
  X,
  UserPlus,
  ArrowUpDown,
} from "lucide-react";
import type { Folder, WishlistItem } from "@/types";

export function FolderDetailPage() {
  const { folderId } = useParams<{ folderId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [folder, setFolder] = useState<Folder | null>(null);
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const deleteFolderMutation = useDeleteFolder(folder?.ownerId || "");
  const updateFolderMutation = useUpdateFolder();
  const reorderMutation = useReorderFolderItems(folderId || "");

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Prevent body scroll while dragging
  useEffect(() => {
    if (isDragging) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    } else {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, [isDragging]);

  // Fetch owner data
  const { data: owner } = useUserById(folder?.ownerId);

  const isOwner = user?.id === folder?.ownerId;

  const ownerName = owner
    ? owner.firstName || owner.lastName
      ? `${owner.firstName || ""} ${owner.lastName || ""}`.trim()
      : owner.username
    : "";

  // Fetch folder data
  useEffect(() => {
    if (!folderId) return;

    const unsubscribe = onSnapshot(doc(db, "folders", folderId), (docSnap) => {
      if (docSnap.exists()) {
        setFolder({ id: docSnap.id, ...docSnap.data() } as Folder);
      } else {
        setFolder(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [folderId]);

  // Fetch items in this folder
  useEffect(() => {
    if (!folderId || !folder) return;

    const q = query(
      collection(db, "wishlistItems"),
      where("ownerId", "==", folder.ownerId),
      where("folderIds", "array-contains", folderId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newItems = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as WishlistItem[];

      // Sort items based on folder.itemOrder
      if (folder.itemOrder && folder.itemOrder.length > 0) {
        const orderMap = new Map(folder.itemOrder.map((id, index) => [id, index]));
        newItems.sort((a, b) => {
          const orderA = orderMap.get(a.id) ?? Infinity;
          const orderB = orderMap.get(b.id) ?? Infinity;
          return orderA - orderB;
        });
      }

      setItems(newItems);
    });

    return () => unsubscribe();
  }, [folderId, folder]);

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setIsDragging(false);
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newItems = [...items];
        const [movedItem] = newItems.splice(oldIndex, 1);
        newItems.splice(newIndex, 0, movedItem);
        setItems(newItems);
        reorderMutation.mutate(newItems.map((item) => item.id));
      }
    }
  };

  const handleDelete = async () => {
    if (!folderId) return;
    await deleteFolderMutation.mutateAsync(folderId);
    navigate(-1);
  };

  const handleStartEdit = () => {
    setEditName(folder?.name || "");
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!folderId || !editName.trim()) return;
    await updateFolderMutation.mutateAsync({ folderId, name: editName.trim() });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditName("");
  };

  const handleEditItem = (item: WishlistItem) => {
    setEditingItem(item);
    setFormOpen(true);
  };

  const handleCloseForm = (open: boolean) => {
    if (!open) {
      setFormOpen(false);
      setTimeout(() => setEditingItem(null), 350);
    } else {
      setFormOpen(true);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="aspect-square w-full rounded-xl" />
            ))}
          </div>
        </div>
      </PageContainer>
    );
  }

  if (!folder) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FolderOpen className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold">Folder not found</h2>
          <p className="text-sm text-muted-foreground mt-1">
            This folder may have been deleted
          </p>
          <Button className="mt-4" onClick={() => navigate(-1)}>
            Go back
          </Button>
        </div>
      </PageContainer>
    );
  }

  const shareUrl = `${window.location.origin}/folder/${folderId}`;

  const header = (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-2">
        {user ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (isOwner) {
                navigate("/profile?tab=folders");
              } else {
                navigate(`/friends/${folder.ownerId}?tab=folders`);
              }
            }}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
            <UserPlus className="w-4 h-4 mr-1" />
            Sign up
          </Button>
        )}
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="h-8 w-40"
              autoFocus
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={handleSaveEdit}
              disabled={!editName.trim() || updateFolderMutation.isPending}
            >
              {updateFolderMutation.isPending ? (
                <Spinner size="sm" />
              ) : (
                <Check className="w-4 h-4" />
              )}
            </Button>
            <Button size="icon" variant="ghost" onClick={handleCancelEdit}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <h1 className="text-lg font-semibold">{folder.name}</h1>
        )}
      </div>
      <div className="flex items-center gap-1">
        {!isEditing && (
          <ShareButton url={shareUrl} title={folder.name} />
        )}
        {isOwner && !isEditing && (
          <Popover>
            <PopoverTrigger>
              <MoreVertical className="w-5 h-5" />
            </PopoverTrigger>
            <PopoverContent>
              <PopoverItem onClick={handleStartEdit}>
                <Pencil className="w-4 h-4" />
                Rename
              </PopoverItem>
              <PopoverItem
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </PopoverItem>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );

  return (
    <PageContainer header={header}>
      {/* Reorder button row */}
      {isOwner && items.length > 1 && (
        <div className="flex justify-end mb-4">
          {isReorderMode ? (
            <Button onClick={() => setIsReorderMode(false)}>
              <Check className="w-4 h-4 mr-2" />
              Done
            </Button>
          ) : (
            <Button
              variant="outline"
              size="icon"
              className="h-11"
              onClick={() => setIsReorderMode(true)}
            >
              <ArrowUpDown className="w-5 h-5" />
            </Button>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FolderOpen className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold">Empty folder</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isOwner
              ? "Add items to this folder from your wishlist"
              : "No items in this folder yet"}
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((item) => item.id)}
            strategy={rectSortingStrategy}
            disabled={!isReorderMode}
          >
            <div className="grid grid-cols-2 gap-3">
              {items.map((item) => (
                <WishlistGridItem
                  key={item.id}
                  item={item}
                  isOwner={isOwner}
                  isReorderMode={isReorderMode}
                  onEdit={() => handleEditItem(item)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Owner info - only show if viewing someone else's folder */}
      {owner && !isOwner && (
        <div
          className="flex items-center gap-3 pt-4 mt-4 border-t cursor-pointer"
          onClick={() =>
            navigate(user ? `/friends/${owner.id}` : `/u/${owner.username}`)
          }
        >
          <Avatar
            id={owner.id}
            firstName={owner.firstName}
            lastName={owner.lastName}
            photoURL={owner.photoURL}
          />
          <div>
            <p className="text-sm text-muted-foreground">Folder by</p>
            <p className="font-medium">{ownerName}</p>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete folder</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{folder.name}"? Items in this
              folder will not be deleted, they will just be removed from this
              folder.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteFolderMutation.isPending}
            >
              {deleteFolderMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit item form */}
      {isOwner && folder && (
        <WishlistForm
          userId={folder.ownerId}
          open={formOpen}
          onOpenChange={handleCloseForm}
          editItem={editingItem}
        />
      )}
    </PageContainer>
  );
}
