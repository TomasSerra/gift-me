import { useState, useRef, useEffect } from "react";
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
import { useWishlist, useReorderWishlist } from "@/hooks/useWishlist";
import { usePurchases } from "@/hooks/usePurchases";
import { WishlistGridItem } from "./WishlistGridItem";
import { WishlistForm } from "./WishlistForm";
import { FoldersGrid } from "./FoldersGrid";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Gift,
  Package,
  FolderOpen,
  ArrowUpDown,
  Check,
  FolderPlus,
} from "lucide-react";
import type { WishlistItem, Purchase } from "@/types";
import { cn } from "@/lib/utils";

type TabMode = "products" | "folders";

interface WishlistListProps {
  userId: string;
  isOwner?: boolean;
  isFriend?: boolean;
}

export function WishlistList({ userId, isOwner = false, isFriend = false }: WishlistListProps) {
  const { items, loading } = useWishlist(userId);
  const reorderMutation = useReorderWishlist(userId);

  // Load purchases when viewing someone else's wishlist
  const { purchases } = usePurchases(isOwner ? "" : userId);

  // Create a map for quick lookup of purchases by itemId
  const purchasesByItemId = purchases.reduce(
    (acc, purchase) => {
      acc[purchase.itemId] = purchase;
      return acc;
    },
    {} as Record<string, Purchase>
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);

  // Read initial tab from sessionStorage (set when navigating back from folder)
  const getInitialTab = (): TabMode => {
    const savedTab = sessionStorage.getItem("wishlistTab");
    if (savedTab === "folders") {
      sessionStorage.removeItem("wishlistTab");
      return "folders";
    }
    return "products";
  };
  const [tabMode, setTabMode] = useState<TabMode>(getInitialTab);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [createFolderMode, setCreateFolderMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const isClosingRef = useRef(false);

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

  // Exit reorder mode when tab mode changes
  const handleTabModeChange = (mode: TabMode) => {
    setTabMode(mode);
    setIsReorderMode(false);
  };

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
      {items.length === 0 && tabMode === "products" ? (
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
          {/* Tab mode toggle - full width, hidden in reorder mode */}
          {!isReorderMode && (
            <div className="flex bg-muted rounded-full p-1 h-11">
              <button
                onClick={() => handleTabModeChange("products")}
                className={cn(
                  "flex-1 rounded-full transition-colors flex items-center justify-center gap-2",
                  tabMode === "products"
                    ? "bg-background shadow-sm"
                    : "hover:bg-background/50"
                )}
              >
                <Package className="w-5 h-5" />
                <span className="text-sm font-medium">Wishlist</span>
              </button>
              <button
                onClick={() => handleTabModeChange("folders")}
                className={cn(
                  "flex-1 rounded-full transition-colors flex items-center justify-center gap-2",
                  tabMode === "folders"
                    ? "bg-background shadow-sm"
                    : "hover:bg-background/50"
                )}
              >
                <FolderOpen className="w-5 h-5" />
                <span className="text-sm font-medium">Folders</span>
              </button>
            </div>
          )}

          {/* Action buttons row */}
          {isOwner && (
            <div className="flex items-center gap-2">
              {/* Add Item button - products tab, not in reorder mode */}
              {tabMode === "products" && !isReorderMode && (
                <Button className="flex-1" onClick={() => setFormOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              )}

              {/* Add Folder button - folders tab */}
              {tabMode === "folders" && (
                <Button
                  className="flex-1"
                  onClick={() => setCreateFolderMode(true)}
                >
                  <FolderPlus className="w-4 h-4 mr-2" />
                  Add Folder
                </Button>
              )}

              {/* Reorder mode toggle - products tab, not in reorder mode */}
              {tabMode === "products" && !isReorderMode && (
                <Button
                  variant="outline"
                  className="h-11"
                  onClick={() => setIsReorderMode(true)}
                >
                  <ArrowUpDown className="w-5 h-5" />
                </Button>
              )}

              {/* Done button - only visible in reorder mode */}
              {isReorderMode && (
                <Button
                  className="flex-1"
                  onClick={() => setIsReorderMode(false)}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Done
                </Button>
              )}
            </div>
          )}

          {/* Products grid */}
          {tabMode === "products" && (
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
                      isFriend={isFriend}
                      isReorderMode={isReorderMode}
                      onEdit={() => handleEdit(item)}
                      purchase={purchasesByItemId[item.id]}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/* Folders view */}
          {tabMode === "folders" && (
            <FoldersGrid
              userId={userId}
              isOwner={isOwner}
              startCreating={createFolderMode}
              onCreatingChange={setCreateFolderMode}
            />
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
