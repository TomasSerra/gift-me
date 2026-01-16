import { useParams, useNavigate, useNavigationType } from "react-router-dom";
import { useState } from "react";
import { useSwipeable } from "react-swipeable";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useDeleteWishlistItem } from "@/hooks/useWishlist";
import { useUserById } from "@/hooks/useUserById";
import { useFolders } from "@/hooks/useFolders";
import { usePurchases, useCreatePurchase, useDeletePurchase } from "@/hooks/usePurchases";
import { useFriendshipStatus } from "@/hooks/useFriendshipStatus";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { WishlistForm } from "@/components/wishlist/WishlistForm";
import { ShareButton } from "@/components/ui/share-button";
import {
  ArrowLeft,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  UserPlus,
  MoreVertical,
  FolderOpen,
  Eye,
  Gift,
  Check,
  X,
} from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverItem,
} from "@/components/ui/popover";
import { cn, formatPrice } from "@/lib/utils";
import type { WishlistItem } from "@/types";

async function fetchWishlistItem(itemId: string): Promise<WishlistItem | null> {
  const itemDoc = await getDoc(doc(db, "wishlistItems", itemId));
  if (!itemDoc.exists()) return null;
  return { id: itemDoc.id, ...itemDoc.data() } as WishlistItem;
}

const getFaviconUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
  } catch {
    return null;
  }
};

export function WishlistItemDetailPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const { user: currentUser } = useAuth();
  const deleteMutation = useDeleteWishlistItem();
  const queryClient = useQueryClient();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [linksSheetOpen, setLinksSheetOpen] = useState(false);
  const [faviconErrors, setFaviconErrors] = useState<Set<number>>(new Set());
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [cancelPurchaseDialogOpen, setCancelPurchaseDialogOpen] = useState(false);
  const createPurchaseMutation = useCreatePurchase();
  const deletePurchaseMutation = useDeletePurchase();

  // Try to get cached item first
  const cachedItem = queryClient.getQueryData<WishlistItem>(
    queryKeys.wishlist.item(itemId || "")
  );

  const {
    data: item,
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: queryKeys.wishlist.item(itemId || ""),
    queryFn: () => fetchWishlistItem(itemId!),
    enabled: !!itemId,
    initialData: cachedItem,
    staleTime: cachedItem ? 1000 * 60 * 5 : 0, // Use cache for 5 min if available
  });

  // Fetch owner data using cached hook
  const { data: owner } = useUserById(item?.ownerId);

  // Fetch folders for the item's owner
  const { folders } = useFolders(item?.ownerId || "");

  // Get folders this item belongs to
  const itemFolders = folders.filter((folder) =>
    item?.folderIds?.includes(folder.id)
  );

  const isOwner = currentUser?.id === item?.ownerId;

  // Check friendship status
  const { data: friendshipData } = useFriendshipStatus(currentUser?.id, item?.ownerId);
  const isFriend = friendshipData?.status === "friends";

  // Load purchases for this item's owner
  const { purchases } = usePurchases(item?.ownerId || "");
  const purchase = purchases.find((p) => p.itemId === itemId);
  const isPurchased = !!purchase;
  const isPurchasedByMe = purchase?.buyerId === currentUser?.id;

  const handlePurchase = async () => {
    if (!item) return;
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
        itemOwnerId: item!.ownerId,
      });
    }
    setCancelPurchaseDialogOpen(false);
  };

  const images = item?.images || [];
  const hasMultipleImages = images.length > 1;
  const currentImage = images[currentImageIndex];
  const isImageLoading =
    images.length > 0 && currentImage && !loadedImages.has(currentImage);

  const handleImageLoad = () => {
    if (currentImage) {
      setLoadedImages((prev) => new Set(prev).add(currentImage));
    }
  };

  const isFirst = currentImageIndex === 0;
  const isLast = currentImageIndex === images.length - 1;

  const goToPrevious = () => {
    if (!isFirst) {
      setCurrentImageIndex((prev) => prev - 1);
    }
  };

  const goToNext = () => {
    if (!isLast) {
      setCurrentImageIndex((prev) => prev + 1);
    }
  };

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (!isLast) setCurrentImageIndex((prev) => prev + 1);
    },
    onSwipedRight: () => {
      if (!isFirst) setCurrentImageIndex((prev) => prev - 1);
    },
    preventScrollOnSwipe: true,
    trackMouse: false,
  });

  const handleEditFormClose = (open: boolean) => {
    setEditFormOpen(open);
    if (!open) {
      // Refetch item data after edit form closes
      refetch();
    }
  };

  const ownerName = owner
    ? owner.firstName || owner.lastName
      ? `${owner.firstName || ""} ${owner.lastName || ""}`.trim()
      : owner.username
    : "";

  const handleDelete = async () => {
    if (!item) return;
    await deleteMutation.mutateAsync(item.id);
    setDeleteDialogOpen(false);
    navigate(-1);
  };

  const shareUrl = `${window.location.origin}/item/${itemId}`;

  // Support both new links array and legacy link field
  const links = item?.links?.length
    ? item.links
    : item?.link
    ? [item.link]
    : [];
  const hasLinks = links.length > 0;
  const hasMultipleLinks = links.length > 1;
  const firstLink = links[0];
  const firstFaviconUrl = firstLink ? getFaviconUrl(firstLink) : null;

  // Show back button if user is logged in OR if they navigated here from within the app
  const showBackButton = currentUser || navigationType === "PUSH";

  const header = (
    <div className="flex items-center gap-3 p-4">
      {showBackButton ? (
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
          <UserPlus className="w-4 h-4 mr-1" />
          Sign up
        </Button>
      )}
      <h1 className="text-lg font-semibold truncate flex-1">
        {loading ? "Loading..." : item?.name || "Item not found"}
      </h1>
      <div className="flex items-center gap-1">
        {item && (
          <ShareButton
            url={shareUrl}
            title={item.name}
            text={item.description}
            variant="ghost"
          />
        )}
        {isOwner && item && (
          <Popover>
            <PopoverTrigger className="bg-transparent hover:bg-accent">
              <MoreVertical className="w-5 h-5" />
            </PopoverTrigger>
            <PopoverContent align="end">
              <PopoverItem onClick={() => setEditFormOpen(true)}>
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
  );

  if (loading && !cachedItem) {
    return (
      <PageContainer header={header} noPadding>
        <Skeleton className="w-full aspect-square" />
        <div className="p-4 space-y-3">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-20 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (!item) {
    return (
      <PageContainer header={header}>
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">Item not found</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate(-1)}
          >
            Go Back
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer header={header} noPadding>
      {/* Image carousel */}
      {images.length > 0 ? (
        <div {...swipeHandlers} className="relative bg-muted">
          <div className="aspect-square relative">
            {isImageLoading && <Skeleton className="absolute inset-0 z-10" />}
            <img
              src={currentImage}
              alt={`${item.name} - Image ${currentImageIndex + 1}`}
              className={cn(
                "w-full h-full object-contain",
                isImageLoading && "opacity-0",
                isPurchased && "opacity-50"
              )}
              onLoad={handleImageLoad}
            />
            {/* Purchased badge */}
            {isPurchased && !isOwner && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className={cn(
                    "text-sm font-semibold px-4 py-3 rounded-md shadow-lg flex items-center gap-2",
                    isPurchasedByMe
                      ? "bg-primary/80 text-primary-foreground"
                      : "bg-slate-700/90 text-slate-100"
                  )}
                >
                  {isPurchasedByMe
                    ? "You bought this"
                    : `Bought by ${purchase?.buyerName}`}
                  <Check size={18} />
                </div>
              </div>
            )}
          </div>

          {hasMultipleImages && (
            <>
              {!isFirst && (
                <button
                  onClick={goToPrevious}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
              )}
              {!isLast && (
                <button
                  onClick={goToNext}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              )}

              {/* Dots indicator */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all",
                      index === currentImageIndex
                        ? "bg-white"
                        : "bg-white/50 hover:bg-white/70"
                    )}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className={cn(
          "aspect-square bg-muted flex items-center justify-center relative",
          isPurchased && "opacity-50"
        )}>
          <Gift size={50} className="text-muted-foreground" />
          {/* Purchased badge for items without images */}
          {isPurchased && !isOwner && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className={cn(
                  "text-sm font-semibold px-4 py-3 rounded-md shadow-lg flex items-center gap-2",
                  isPurchasedByMe
                    ? "bg-primary/80 text-primary-foreground"
                    : "bg-slate-700/90 text-slate-100"
                )}
              >
                {isPurchasedByMe
                  ? "You bought this"
                  : `Bought by ${purchase?.buyerName}`}
                <Check size={18} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Item details */}
      <div className="p-4 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">{item.name}</h1>
          {item.price && (
            <p className="text-xl text-primary font-semibold mt-1">
              {formatPrice(item.price, item.currency)}
            </p>
          )}
        </div>

        {item.description && (
          <p className="text-muted-foreground whitespace-pre-line">
            {item.description}
          </p>
        )}

        {/* Folder badges */}
        {itemFolders.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {itemFolders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => navigate(`/folder/${folder.id}`)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-full text-sm font-medium transition-colors"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                {folder.name}
              </button>
            ))}
          </div>
        )}

        {hasLinks && (
          hasMultipleLinks ? (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setLinksSheetOpen(true)}
            >
              <Eye className="w-4 h-4" />
              View {links.length} product links
            </Button>
          ) : (
            <a
              href={firstLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block"
            >
              <Button variant="outline" className="gap-2">
                {firstFaviconUrl && !faviconErrors.has(0) ? (
                  <img
                    src={firstFaviconUrl}
                    alt=""
                    className="w-4 h-4 rounded-sm bg-white"
                    onError={() => setFaviconErrors((prev) => new Set(prev).add(0))}
                  />
                ) : (
                  <ExternalLink className="w-4 h-4" />
                )}
                View product website
              </Button>
            </a>
          )
        )}

        {/* Purchase actions - only for authenticated friends */}
        {!isOwner && currentUser && isFriend && (
          <div>
            {!isPurchased ? (
              <Button
                className="w-full"
                onClick={() => setPurchaseDialogOpen(true)}
              >
                <Gift className="w-4 h-4 mr-2" />
                I bought this
              </Button>
            ) : isPurchasedByMe ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setCancelPurchaseDialogOpen(true)}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel purchase
              </Button>
            ) : null}
          </div>
        )}

        {/* Owner info - only show if viewing someone else's item */}
        {owner && !isOwner && (
          <div
            className="flex items-center gap-3 pt-4 border-t cursor-pointer"
            onClick={() =>
              navigate(
                currentUser ? `/friends/${owner.id}` : `/u/${owner.username}`
              )
            }
          >
            <Avatar
              id={owner.id}
              firstName={owner.firstName}
              lastName={owner.lastName}
              photoURL={owner.photoURL}
            />
            <div>
              <p className="text-sm text-muted-foreground">
                From the wishlist of
              </p>
              <p className="font-medium">{ownerName}</p>
            </div>
          </div>
        )}
      </div>

      {/* Edit form for owner */}
      {isOwner && item && (
        <WishlistForm
          userId={item.ownerId}
          open={editFormOpen}
          onOpenChange={handleEditFormClose}
          editItem={item}
        />
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{item?.name}" from your wishlist?
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

      {/* Purchase confirmation dialog */}
      <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Purchased</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark "{item?.name}" as purchased? Other
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
              {createPurchaseMutation.isPending
                ? "Marking..."
                : "Yes, I bought this"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel purchase confirmation dialog */}
      <Dialog
        open={cancelPurchaseDialogOpen}
        onOpenChange={setCancelPurchaseDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Purchase</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your purchase of "{item?.name}"?
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

      {/* Links sheet for multiple links */}
      <Sheet open={linksSheetOpen} onOpenChange={setLinksSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Product Links</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-3 mt-4">
            {links.map((link, index) => {
              const faviconUrl = getFaviconUrl(link);
              const hostname = (() => {
                try {
                  return new URL(link).hostname.replace("www.", "");
                } catch {
                  return link;
                }
              })();
              return (
                <a
                  key={index}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted transition-colors"
                >
                  {faviconUrl && !faviconErrors.has(index) ? (
                    <img
                      src={faviconUrl}
                      alt=""
                      className="w-6 h-6 rounded bg-white"
                      onError={() => setFaviconErrors((prev) => new Set(prev).add(index))}
                    />
                  ) : (
                    <ExternalLink className="w-6 h-6 text-muted-foreground" />
                  )}
                  <span className="flex-1 truncate text-sm">{hostname}</span>
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </a>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </PageContainer>
  );
}
