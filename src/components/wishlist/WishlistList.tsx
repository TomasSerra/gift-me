import { useState, useRef } from "react";
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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useWishlist, useReorderWishlist } from "@/hooks/useWishlist";
import { WishlistItemCard } from "./WishlistItem";
import { WishlistGridItem } from "./WishlistGridItem";
import { WishlistForm } from "./WishlistForm";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Gift, LayoutGrid, List, ArrowUpDown, Check } from "lucide-react";
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
  const [isReorderMode, setIsReorderMode] = useState(false);
  const isClosingRef = useRef(false);

  // DnD sensors - only active when in reorder mode
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

  // Exit reorder mode when view mode changes
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    setIsReorderMode(false);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newItems = [...items];
        const [movedItem] = newItems.splice(oldIndex, 1);
        newItems.splice(newIndex, 0, movedItem);
        reorderMutation.mutate(newItems);
      }
    }
  };

  const handleEdit = (item: WishlistItem) => {
    setEditingItem(item);
    setFormOpen(true);
    isClosingRef.current = false;
  };

  const handleCloseForm = (open: boolean) => {
    if (!open && isClosingRef.current) return;

    if (!open) {
      isClosingRef.current = true;
      setFormOpen(false);
      setTimeout(() => {
        setEditingItem(null);
        isClosingRef.current = false;
      }, 350);
    } else {
      setFormOpen(true);
    }
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

  return (
    <>
      {items.length === 0 ? (
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
        </div>
      ) : (
        <div className="space-y-4">
          {/* Header with Add button, reorder toggle, and view toggle */}
          <div className="flex items-center gap-2">
            {isOwner && !isReorderMode && (
              <Button className="flex-1" onClick={() => setFormOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            )}

            {/* Reorder mode toggle - only for owners */}
            {isOwner && (
              <Button
                variant={isReorderMode ? "default" : "outline"}
                className={cn("h-11", isReorderMode && "flex-1")}
                onClick={() => setIsReorderMode(!isReorderMode)}
              >
                {isReorderMode ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Done
                  </>
                ) : (
                  <ArrowUpDown className="w-5 h-5" />
                )}
              </Button>
            )}

            {/* View mode toggle */}
            <div className="flex bg-muted rounded-full p-1 h-11">
              <button
                onClick={() => handleViewModeChange("grid")}
                className={cn(
                  "px-4 rounded-full transition-colors flex items-center justify-center",
                  viewMode === "grid"
                    ? "bg-background shadow-sm"
                    : "hover:bg-background/50"
                )}
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleViewModeChange("list")}
                className={cn(
                  "px-4 rounded-full transition-colors flex items-center justify-center",
                  viewMode === "list"
                    ? "bg-background shadow-sm"
                    : "hover:bg-background/50"
                )}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Grid view */}
          {viewMode === "grid" && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
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
                      onEdit={() => handleEdit(item)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/* List view */}
          {viewMode === "list" && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={items.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
                disabled={!isReorderMode}
              >
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <WishlistItemCard
                      key={item.id}
                      item={item}
                      isOwner={isOwner}
                      isReorderMode={isReorderMode}
                      onEdit={() => handleEdit(item)}
                      priority={index + 1}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}

      {/* Single WishlistForm instance - always rendered */}
      {isOwner && (
        <WishlistForm
          userId={userId}
          open={formOpen}
          onOpenChange={handleCloseForm}
          editItem={editingItem}
        />
      )}
    </>
  );
}
