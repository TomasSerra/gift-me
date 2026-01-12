import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { ImageCarousel } from "./ImageCarousel";
import { useDeleteWishlistItem } from "@/hooks/useWishlist";
import {
  ChevronUp,
  ChevronDown,
  Pencil,
  Trash2,
  ExternalLink,
} from "lucide-react";
import type { WishlistItem } from "@/types";

interface WishlistItemCardProps {
  item: WishlistItem;
  isOwner?: boolean;
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
  onEdit,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  priority,
}: WishlistItemCardProps) {
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const deleteMutation = useDeleteWishlistItem();

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

  return (
    <>
      <Card
        className="overflow-hidden cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={handleCardClick}
      >
        <CardContent className="p-0">
          <div className="flex relative">
            {/* Image or priority number - absolutely positioned so it doesn't affect row height */}
            <div className="absolute left-0 top-0 bottom-0 w-28">
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

            {/* Content - with left margin for image space */}
            <div className="flex-1 p-3 ml-28 min-w-0 min-h-24">
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

                {/* Owner actions */}
                {isOwner && (
                  <div
                    className="flex flex-col gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={onMoveUp}
                      disabled={isFirst}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={onMoveDown}
                      disabled={isLast}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Action buttons */}
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

                {isOwner && (
                  <div
                    className="flex items-center gap-1 ml-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={onEdit}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
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
