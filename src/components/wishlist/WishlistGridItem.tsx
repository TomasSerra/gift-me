import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { useDeleteWishlistItem } from "@/hooks/useWishlist";
import { Pencil, Trash2 } from "lucide-react";
import type { WishlistItem } from "@/types";

interface WishlistGridItemProps {
  item: WishlistItem;
  isOwner?: boolean;
  onEdit?: () => void;
}

export function WishlistGridItem({
  item,
  isOwner = false,
  onEdit,
}: WishlistGridItemProps) {
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
        className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
        onClick={handleCardClick}
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
            <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
              +{item.images.length - 1}
            </div>
          )}

          {/* Owner actions overlay */}
          {isOwner && (
            <div
              className="absolute top-2 left-2 flex gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={onEdit}
                className="bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setDeleteDialogOpen(true)}
                className="bg-black/60 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-2">
          <h3 className="font-medium text-sm truncate">{item.name}</h3>
          {item.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {item.description}
            </p>
          )}
          {item.price && (
            <p className="text-sm text-primary font-semibold mt-1">
              {formatPrice(item.price)}
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
