import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { useDeleteWishlistItem } from "@/hooks/useWishlist";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import type { WishlistItem } from "@/types";

interface WishlistGridItemProps {
  item: WishlistItem;
  isOwner?: boolean;
  isReorderMode?: boolean;
  onEdit?: () => void;
}

export function WishlistGridItem({
  item,
  isOwner = false,
  isReorderMode = false,
  onEdit,
}: WishlistGridItemProps) {
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const deleteMutation = useDeleteWishlistItem();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: !isReorderMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleCardClick = () => {
    navigate(`/item/${item.id}`);
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(item.id);
    setDeleteDialogOpen(false);
  };

  const shareUrl = `${window.location.origin}/item/${item.id}`;

  return (
    <>
      <Card
        ref={setNodeRef}
        style={style}
        className={cn(
          "overflow-hidden cursor-pointer hover:shadow-md transition-shadow",
          isReorderMode && "touch-none",
          isDragging && "opacity-50 shadow-lg z-50"
        )}
        onClick={isReorderMode ? undefined : handleCardClick}
        {...(isReorderMode ? { ...attributes, ...listeners } : {})}
      >
        {/* Image */}
        <div className="aspect-square relative bg-muted">
          {item.images && item.images.length > 0 ? (
            <img
              src={item.images[0]}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-4xl">🎁</span>
            </div>
          )}

          {/* Multiple images indicator */}
          {item.images && item.images.length > 1 && (
            <div className="absolute bottom-2 right-2 bg-white/70 text-black text-xs font-medium px-1.5 py-0.5 rounded-full">
              +{item.images.length - 1}
            </div>
          )}

          {/* Actions overlay - hidden in reorder mode */}
          {!isReorderMode && (
            <>
              <div
                className="absolute top-2 left-2 flex gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <ShareButton url={shareUrl} title={item.name} />
              </div>
              <div className="absolute top-2 right-2">
                {isOwner && (
              <Popover>
                <PopoverTrigger>
                  <MoreVertical className="w-5 h-5" />
                </PopoverTrigger>
                <PopoverContent>
                  <PopoverItem onClick={onEdit}>
                    <Pencil className="w-4 h-4" />
                    Edit
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
            </>
          )}
        </div>

        {/* Info */}
        <div className="p-3">
          <h3 className="font-medium text-sm truncate">{item.name}</h3>
          {item.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {item.description}
            </p>
          )}
          {item.price && (
            <p className="text-sm text-primary font-semibold mt-1">
              {formatPrice(item.price, item.currency)}
            </p>
          )}
        </div>
      </Card>

      {/* Confirm delete dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{item.name}" from your wishlist?
              This action cannot be undone.
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
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
