import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useSwipeable } from "react-swipeable";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useDeleteWishlistItem } from "@/hooks/useWishlist";
import { useUserById } from "@/hooks/useUserById";
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
import { WishlistForm } from "@/components/wishlist/WishlistForm";
import { ArrowLeft, ExternalLink, ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WishlistItem } from "@/types";

async function fetchWishlistItem(itemId: string): Promise<WishlistItem | null> {
  const itemDoc = await getDoc(doc(db, "wishlistItems", itemId));
  if (!itemDoc.exists()) return null;
  return { id: itemDoc.id, ...itemDoc.data() } as WishlistItem;
}

export function WishlistItemDetailPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const deleteMutation = useDeleteWishlistItem();
  const queryClient = useQueryClient();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Try to get cached item first
  const cachedItem = queryClient.getQueryData<WishlistItem>(
    queryKeys.wishlist.item(itemId || "")
  );

  const { data: item, isLoading: loading, refetch } = useQuery({
    queryKey: queryKeys.wishlist.item(itemId || ""),
    queryFn: () => fetchWishlistItem(itemId!),
    enabled: !!itemId,
    initialData: cachedItem,
    staleTime: cachedItem ? 1000 * 60 * 5 : 0, // Use cache for 5 min if available
  });

  // Fetch owner data using cached hook
  const { data: owner } = useUserById(item?.ownerId);

  const isOwner = currentUser?.id === item?.ownerId;

  const images = item?.images || [];
  const hasMultipleImages = images.length > 1;
  const currentImage = images[currentImageIndex];
  const isImageLoading = images.length > 0 && currentImage && !loadedImages.has(currentImage);

  const handleImageLoad = () => {
    if (currentImage) {
      setLoadedImages((prev) => new Set(prev).add(currentImage));
    }
  };

  const goToPrevious = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const swipeHandlers = useSwipeable({
    onSwipedLeft: goToNext,
    onSwipedRight: goToPrevious,
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
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

  const header = (
    <div className="flex items-center gap-3 p-4">
      <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
        <ArrowLeft className="w-5 h-5" />
      </Button>
      <h1 className="text-lg font-semibold truncate flex-1">
        {loading ? "Loading..." : item?.name || "Item not found"}
      </h1>
      {isOwner && item && (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => setEditFormOpen(true)}>
            <Pencil className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="w-5 h-5" />
          </Button>
        </div>
      )}
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
          <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
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
              className={cn("w-full h-full object-contain", isImageLoading && "opacity-0")}
              onLoad={handleImageLoad}
            />
          </div>

          {hasMultipleImages && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
              >
                <ChevronRight className="h-6 w-6" />
              </button>

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
        <div className="aspect-square bg-muted flex items-center justify-center">
          <span className="text-6xl">🎁</span>
        </div>
      )}

      {/* Item details */}
      <div className="p-4 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">{item.name}</h1>
          {item.price && (
            <p className="text-xl text-primary font-semibold mt-1">
              {formatPrice(item.price)}
            </p>
          )}
        </div>

        {item.description && (
          <p className="text-muted-foreground">{item.description}</p>
        )}

        {item.link && (
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block"
          >
            <Button variant="outline" className="gap-2">
              <ExternalLink className="w-4 h-4" />
              View product link
            </Button>
          </a>
        )}

        {/* Owner info - only show if viewing someone else's item */}
        {owner && !isOwner && (
          <div
            className="flex items-center gap-3 pt-4 border-t cursor-pointer"
            onClick={() => navigate(`/friends/${owner.id}`)}
          >
            <Avatar
              id={owner.id}
              firstName={owner.firstName}
              lastName={owner.lastName}
              photoURL={owner.photoURL}
            />
            <div>
              <p className="text-sm text-muted-foreground">From the wishlist of</p>
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
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
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
    </PageContainer>
  );
}
