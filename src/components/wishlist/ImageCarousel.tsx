import { useState, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ImageCarouselProps {
  images: string[];
  compact?: boolean;
}

export function ImageCarousel({ images, compact = false }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const touchStartX = useRef<number | null>(null);

  const currentImage = images[currentIndex];
  const isLoading = !loadedImages.has(currentImage);

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === images.length - 1;

  const handleImageLoad = () => {
    setLoadedImages((prev) => new Set(prev).add(currentImage));
  };

  if (images.length === 0) return null;

  const goToPrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isFirst) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLast) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;

    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    const threshold = 50;

    if (diff > threshold && !isLast) {
      // Swipe left -> next image
      setCurrentIndex((prev) => prev + 1);
    } else if (diff < -threshold && !isFirst) {
      // Swipe right -> previous image
      setCurrentIndex((prev) => prev - 1);
    }

    touchStartX.current = null;
  };

  return (
    <div
      className={cn("relative overflow-hidden", compact ? "h-full" : "h-48")}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {isLoading && <Skeleton className="absolute inset-0 z-10" />}
      <img
        src={currentImage}
        alt={`Imagen ${currentIndex + 1}`}
        className={cn("w-full h-full object-cover", isLoading && "opacity-0")}
        onLoad={handleImageLoad}
      />

      {images.length > 1 && (
        <>
          {/* Navigation arrows */}
          {!compact && (
            <>
              {!isFirst && (
                <button
                  onClick={goToPrevious}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              {!isLast && (
                <button
                  onClick={goToNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 transition-colors"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
            </>
          )}

          {/* Dots indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(index);
                }}
                className={cn(
                  "rounded-full transition-all",
                  compact ? "w-1.5 h-1.5" : "w-2 h-2",
                  index === currentIndex
                    ? "bg-white"
                    : "bg-white/50 hover:bg-white/70"
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
