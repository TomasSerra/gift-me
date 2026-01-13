import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
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
import { ImageCarousel } from "./ImageCarousel";
import { useDeleteWishlistItem } from "@/hooks/useWishlist";
import { shareContent } from "@/lib/share";
import {
  GripVertical,
  MoreVertical,
  Pencil,
  Trash2,
  ExternalLink,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WishlistItem } from "@/types";

interface WishlistItemCardProps {
  item: WishlistItem;
  isOwner?: boolean;
  isReorderMode?: boolean;
  onEdit?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  priority?: number;
}

export function WishlistItemCard({
  item,
  isOwner = false,
  isReorderMode = false,
  onEdit,
  priority,
}: WishlistItemCardProps) {
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  const shareUrl = `${window.location.origin}/item/${item.id}`;

  return (
    <>
      <Card
        ref={setNodeRef}
        style={style}
        className={cn(
          "cursor-pointer hover:bg-accent/50 transition-colors",
          isDragging && "opacity-50 shadow-lg z-50"
        )}
        onClick={handleCardClick}
      >
        <CardContent className="p-0">
          <div className="flex relative">
            {/* Drag handle - only visible in reorder mode */}
            {isReorderMode && (
              <div
                className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none z-10"
                onClick={(e) => e.stopPropagation()}
                {...attributes}
                {...listeners}
              >
                <GripVertical className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            {/* Image or priority number - absolutely positioned so it doesn't affect row height */}
            <div
              className={cn(
                "absolute top-0 bottom-0 w-28 overflow-hidden",
                isReorderMode ? "left-8" : "left-0 rounded-l-lg"
              )}
            >
              {item.images && item.images.length > 0 ? (
                <ImageCarousel images={item.images} compact />
              ) : (
                <div className="h-full bg-muted flex items-center justify-center">
                  <span className="text-2xl font-bold text-muted-foreground">
                    {priority || "#"}
                  </span>
                </div>
              )}
            </div>

            {/* Content - with left margin for image space (and drag handle if reorder mode) */}
            <div className={cn("flex-1 p-3 min-w-0 min-h-24", isReorderMode ? "ml-36" : "ml-28")}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium truncate">{item.name}</h3>
                  {item.price && (
                    <p className="text-sm text-primary font-semibold">
                      {formatPrice(item.price)}
                    </p>
                  )}
                  {item.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {item.description}
                    </p>
                  )}
                </div>

              </div>

              {/* Action buttons - hidden in reorder mode */}
              {!isReorderMode && (
                <div className="flex items-center gap-2 mt-2">
                  {item.link && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View link
                    </a>
                  )}

                  <div
                    className="flex items-center gap-1 ml-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Share button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        shareContent({ title: item.name, url: shareUrl });
                      }}
                    >
                      <Share2 className="h-5 w-5" />
                    </Button>

                    {/* Owner actions popover */}
                    {isOwner && (
                      <Popover>
                        <PopoverTrigger className="bg-transparent hover:bg-accent p-2">
                          <MoreVertical className="h-5 w-5 text-foreground" />
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
                </div>
              )}
            </div>
          </div>
        </CardContent>
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
