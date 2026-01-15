import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Folder, WishlistItem } from "@/types";

interface FolderCardProps {
  folder: Folder;
  items: WishlistItem[];
}

export function FolderCard({ folder, items }: FolderCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/folder/${folder.id}`);
  };

  // Get up to 4 images from items
  const previewImages: (string | null)[] = [];
  for (let i = 0; i < 4; i++) {
    const item = items[i];
    if (item?.images?.[0]) {
      previewImages.push(item.images[0]);
    } else {
      previewImages.push(null);
    }
  }

  return (
    <Card
      className={cn(
        "overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
      )}
      onClick={handleClick}
    >
      {/* 2x2 Grid of images */}
      <div className="aspect-square relative bg-muted">
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-0.5">
          {previewImages.map((imageUrl, index) => (
            <div
              key={index}
              className={cn(
                "bg-muted flex items-center justify-center overflow-hidden",
                imageUrl ? "bg-muted" : "bg-gray-700"
              )}
            >
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <Gift className="w-6 h-6 text-gray-600" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Folder name */}
      <div className="p-3">
        <h3 className="font-medium text-sm truncate">{folder.name}</h3>
        <p className="text-xs text-muted-foreground">
          {items.length} {items.length === 1 ? "item" : "items"}
        </p>
      </div>
    </Card>
  );
}
