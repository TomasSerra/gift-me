import { useState, useRef } from "react";
import { useWishlist, useReorderWishlist } from "@/hooks/useWishlist";
import { WishlistItemCard } from "./WishlistItem";
import { WishlistGridItem } from "./WishlistGridItem";
import { WishlistForm } from "./WishlistForm";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Gift, LayoutGrid, List } from "lucide-react";
import type { WishlistItem } from "@/types";
import { cn } from "@/lib/utils";

type ViewMode = "grid" | "list";

interface WishlistListProps {
  userId: string;
  isOwner?: boolean;
}

export function WishlistList({ userId, isOwner = false }: WishlistListProps) {
  const { items, loading } = useWishlist(userId);
  const reorderMutation = useReorderWishlist(userId);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const isClosingRef = useRef(false);

  const handleEdit = (item: WishlistItem) => {
    setEditingItem(item);
    setFormOpen(true);
    isClosingRef.current = false;
  };

  const handleCloseForm = (open: boolean) => {
    if (!open && isClosingRef.current) return; // Prevent multiple close calls

    if (!open) {
      isClosingRef.current = true;
      setFormOpen(false);
      // Reset editingItem after sheet animation completes
      setTimeout(() => {
        setEditingItem(null);
        isClosingRef.current = false;
      }, 350);
    } else {
      setFormOpen(true);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...items];
    [newItems[index - 1], newItems[index]] = [
      newItems[index],
      newItems[index - 1],
    ];
    reorderMutation.mutate(newItems);
  };

  const handleMoveDown = (index: number) => {
    if (index === items.length - 1) return;
    const newItems = [...items];
    [newItems[index], newItems[index + 1]] = [
      newItems[index + 1],
      newItems[index],
    ];
    reorderMutation.mutate(newItems);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <Gift className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-foreground">
          {isOwner ? "Your wishlist is empty" : "Empty wishlist"}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {isOwner
            ? "Add items you'd like to receive"
            : "This user hasn't added items yet"}
        </p>
        {isOwner && (
          <Button className="mt-4" onClick={() => setFormOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        )}

        {isOwner && (
          <WishlistForm
            userId={userId}
            open={formOpen}
            onOpenChange={handleCloseForm}
            editItem={editingItem}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Add button and view toggle */}
      <div className="flex items-center gap-2">
        {isOwner && (
          <Button className="flex-1" onClick={() => setFormOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        )}

        {/* View mode toggle */}
        <div className="flex bg-muted rounded-lg p-1">
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "p-2 rounded-md transition-colors",
              viewMode === "grid"
                ? "bg-background shadow-sm"
                : "hover:bg-background/50"
            )}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "p-2 rounded-md transition-colors",
              viewMode === "list"
                ? "bg-background shadow-sm"
                : "hover:bg-background/50"
            )}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid view */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-2 gap-3">
          {items.map((item) => (
            <WishlistGridItem
              key={item.id}
              item={item}
              isOwner={isOwner}
              onEdit={() => handleEdit(item)}
            />
          ))}
        </div>
      )}

      {/* List view */}
      {viewMode === "list" && (
        <div className="space-y-3">
          {items.map((item, index) => (
            <WishlistItemCard
              key={item.id}
              item={item}
              isOwner={isOwner}
              onEdit={() => handleEdit(item)}
              onMoveUp={() => handleMoveUp(index)}
              onMoveDown={() => handleMoveDown(index)}
              isFirst={index === 0}
              isLast={index === items.length - 1}
              priority={index + 1}
            />
          ))}
        </div>
      )}

      {isOwner && (
        <WishlistForm
          userId={userId}
          open={formOpen}
          onOpenChange={handleCloseForm}
          editItem={editingItem}
        />
      )}
    </div>
  );
}
