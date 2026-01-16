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
import { FolderPicker } from "./FolderPicker";
import { useDeleteWishlistItem } from "@/hooks/useWishlist";
import { useUpdateItemFolders } from "@/hooks/useFolders";
import { useCreatePurchase, useDeletePurchase } from "@/hooks/usePurchases";
import { useAuth } from "@/contexts/AuthContext";
import {
  MoreVertical,
  Pencil,
  Trash2,
  FolderPlus,
  Gift,
  X,
  Check,
} from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import type { WishlistItem, Purchase } from "@/types";
import { Spinner } from "../ui/spinner";

interface WishlistGridItemProps {
  item: WishlistItem;
  isOwner?: boolean;
  isReorderMode?: boolean;
  onEdit?: () => void;
  purchase?: Purchase;
}

export function WishlistGridItem({
  item,
  isOwner = false,
  isReorderMode = false,
  onEdit,
  purchase,
}: WishlistGridItemProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [cancelPurchaseDialogOpen, setCancelPurchaseDialogOpen] =
    useState(false);
  const deleteMutation = useDeleteWishlistItem();
  const updateFoldersMutation = useUpdateItemFolders();
  const createPurchaseMutation = useCreatePurchase();
  const deletePurchaseMutation = useDeletePurchase();

  const isPurchased = !!purchase;
  const isPurchasedByMe = purchase?.buyerId === user?.id;

  const handleFolderSelectionChange = (folderIds: string[]) => {
    updateFoldersMutation.mutate({ itemId: item.id, folderIds });
  };

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

  const handlePurchase = async () => {
    await createPurchaseMutation.mutateAsync({
      itemId: item.id,
      itemOwnerId: item.ownerId,
    });
    setPurchaseDialogOpen(false);
  };

  const handleCancelPurchase = async () => {
    if (purchase) {
      await deletePurchaseMutation.mutateAsync({
        purchaseId: purchase.id,
        itemOwnerId: item.ownerId,
      });
    }
    setCancelPurchaseDialogOpen(false);
  };

  const shareUrl = `${window.location.origin}/item/${item.id}`;

  return (
    <>
      <Card
        ref={setNodeRef}
        style={style}
        className={cn(
          "overflow-hidden cursor-pointer hover:shadow-md transition-shadow flex flex-col",
          isReorderMode && "touch-none",
          isDragging && "opacity-50 shadow-lg z-50"
        )}
        onClick={isReorderMode ? undefined : handleCardClick}
        {...(isReorderMode ? { ...attributes, ...listeners } : {})}
      >
        {/* Image - using padding trick for reliable aspect ratio in flex */}
        <div className="w-full shrink-0 relative" style={{ paddingBottom: '100%' }}>
          <div className="absolute inset-0 bg-muted">
            {item.images && item.images.length > 0 ? (
              <img
                src={item.images[0]}
                alt={item.name}
                className={cn(
                  "w-full h-full object-cover transition-opacity",
                  isPurchased && user && "opacity-50"
                )}
              />
            ) : (
              <div
                className={cn(
                  "w-full h-full flex items-center justify-center bg-gray-700",
                  isPurchased && !isPurchasedByMe && user && "opacity-50"
                )}
              >
                <Gift size={50} className="text-gray-500" />
              </div>
            )}

            {/* Multiple images indicator */}
            {item.images && item.images.length > 1 && !isPurchased && (
              <div className="absolute bottom-2 right-2 bg-white/70 text-black text-xs font-medium px-1.5 py-0.5 rounded-full">
                +{item.images.length - 1}
              </div>
            )}

            {/* Purchased badge - centered on image */}
            {isPurchased && !isOwner && user && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className={cn(
                    "text-xs font-semibold px-3 py-2 rounded-sm shadow-lg flex items-center gap-2",
                    isPurchasedByMe
                      ? "bg-primary/80 text-primary-foreground"
                      : "bg-slate-700/90 text-slate-100"
                  )}
                >
                  {isPurchasedByMe
                    ? "You bought this"
                    : `Bought by ${purchase.buyerName}`}
                  <Check size={14} />
                </div>
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
                        <PopoverItem onClick={() => setFolderPickerOpen(true)}>
                          <FolderPlus className="w-4 h-4" />
                          Add
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
        </div>

        {/* Info */}
        <div className="p-3 flex-1 flex flex-col">
          <h3 className="font-medium text-sm truncate">{item.name}</h3>
          {item.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-line">
              {item.description}
            </p>
          )}
          {item.price && (
            <p className="text-sm text-primary font-semibold mt-1">
              {formatPrice(item.price, item.currency)}
            </p>
          )}

          {/* Purchase actions - only shown when viewing friend's wishlist (and logged in) */}
          {!isOwner && !isReorderMode && user && (
            <div className="mt-auto pt-2" onClick={(e) => e.stopPropagation()}>
              {!isPurchased ? (
                <Button
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => setPurchaseDialogOpen(true)}
                >
                  <Gift className="w-3.5 h-3.5 mr-1.5" />I bought this
                </Button>
              ) : isPurchasedByMe ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs"
                  onClick={() => setCancelPurchaseDialogOpen(true)}
                >
                  <X className="w-3.5 h-3.5 mr-1.5" />
                  Cancel purchase
                </Button>
              ) : null}
            </div>
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

      {/* Folder picker */}
      {isOwner && (
        <FolderPicker
          userId={item.ownerId}
          open={folderPickerOpen}
          onOpenChange={setFolderPickerOpen}
          selectedFolderIds={item.folderIds || []}
          onSelectionChange={handleFolderSelectionChange}
        />
      )}

      {/* Confirm purchase dialog */}
      <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Purchased</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark "{item.name}" as purchased? Other
              friends will see that you're buying this gift.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPurchaseDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePurchase}
              disabled={createPurchaseMutation.isPending}
            >
              {createPurchaseMutation.isPending ? (
                <Spinner size="sm" className="text-white" />
              ) : (
                "Yes, I bought this"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm cancel purchase dialog */}
      <Dialog
        open={cancelPurchaseDialogOpen}
        onOpenChange={setCancelPurchaseDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Purchase</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your purchase of "{item.name}"?
              This will allow other friends to buy it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelPurchaseDialogOpen(false)}
            >
              Keep it
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelPurchase}
              disabled={deletePurchaseMutation.isPending}
            >
              {deletePurchaseMutation.isPending
                ? "Cancelling..."
                : "Cancel purchase"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
