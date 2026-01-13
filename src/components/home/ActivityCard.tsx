import { useState } from "react";
import { useSwipeable } from "react-swipeable";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeTime, formatPrice, cn } from "@/lib/utils";
import type { ActivityWithUser } from "@/hooks/useActivityFeed";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

const getFaviconUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
  } catch {
    return null;
  }
};

interface ActivityCardProps {
  activity: ActivityWithUser;
}

export function ActivityCard({ activity }: ActivityCardProps) {
  const navigate = useNavigate();
  const createdAt = activity.createdAt?.toDate() || new Date();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [faviconError, setFaviconError] = useState(false);
  const faviconUrl = activity.itemLink ? getFaviconUrl(activity.itemLink) : null;

  // Support both new itemImages array and legacy itemImage field
  const images = activity.itemImages?.length
    ? activity.itemImages
    : (activity as ActivityWithUser & { itemImage?: string }).itemImage
      ? [(activity as ActivityWithUser & { itemImage?: string }).itemImage!]
      : [];
  const hasImages = images.length > 0;
  const hasMultipleImages = images.length > 1;

  const currentImage = images[currentImageIndex];
  const isImageLoading = hasImages && !loadedImages.has(currentImage);

  const handleImageLoad = () => {
    setLoadedImages((prev) => new Set(prev).add(currentImage));
  };

  const goToPrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => setCurrentImageIndex((prev) =>
      prev === images.length - 1 ? 0 : prev + 1
    ),
    onSwipedRight: () => setCurrentImageIndex((prev) =>
      prev === 0 ? images.length - 1 : prev - 1
    ),
    preventScrollOnSwipe: true,
    trackMouse: false,
  });

  const handleItemClick = () => {
    navigate(`/item/${activity.wishlistItemId}`);
  };

  return (
    <Card className="overflow-hidden rounded-none border-x-0">
      {/* Header - User info */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={() => navigate(`/friends/${activity.userId}`)}
      >
        <Avatar
          id={activity.user.id}
          firstName={activity.user.firstName}
          lastName={activity.user.lastName}
          photoURL={activity.user.photoURL}
        />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">
            {activity.user.firstName
              ? `${activity.user.firstName} ${activity.user.lastName || ""}`.trim()
              : activity.user.username}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatRelativeTime(createdAt)}
          </p>
        </div>
      </div>

      {/* Image carousel */}
      {hasImages ? (
        <div
          {...swipeHandlers}
          className="relative bg-muted cursor-pointer"
          onClick={handleItemClick}
        >
          <div className="aspect-square relative">
            {isImageLoading && <Skeleton className="absolute inset-0 z-10" />}
            <img
              src={currentImage}
              alt={activity.itemName}
              className={cn("w-full h-full object-cover", isImageLoading && "opacity-0")}
              onLoad={handleImageLoad}
            />
          </div>

          {hasMultipleImages && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1.5 hover:bg-black/70 transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1.5 hover:bg-black/70 transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              {/* Dots indicator */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {images.map((_, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex(index);
                    }}
                    className={cn(
                      "w-1.5 h-1.5 rounded-full transition-all",
                      index === currentImageIndex
                        ? "bg-white"
                        : "bg-white/50"
                    )}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div
          className="aspect-square bg-muted flex items-center justify-center cursor-pointer"
          onClick={handleItemClick}
        >
          <span className="text-6xl">🎁</span>
        </div>
      )}

      {/* Item details */}
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={handleItemClick}
          >
            <h3 className="font-semibold truncate">{activity.itemName}</h3>
            {activity.itemDescription && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {activity.itemDescription}
              </p>
            )}
          </div>
          {activity.itemPrice && (
            <span className="text-primary font-semibold whitespace-nowrap">
              {formatPrice(activity.itemPrice, activity.itemCurrency)}
            </span>
          )}
        </div>

        {activity.itemLink && (
          <a
            href={activity.itemLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            <Button variant="outline" size="sm" className="w-full gap-2">
              {faviconUrl && !faviconError ? (
                <img
                  src={faviconUrl}
                  alt=""
                  className="w-4 h-4 rounded-sm"
                  onError={() => setFaviconError(true)}
                />
              ) : (
                <ExternalLink className="w-4 h-4" />
              )}
              View product
            </Button>
          </a>
        )}
      </CardContent>
    </Card>
  );
}
