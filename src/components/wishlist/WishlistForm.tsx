import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  useCreateWishlistItem,
  useUpdateWishlistItem,
} from "@/hooks/useWishlist";
import { uploadMultipleImages, deleteMultipleImages } from "@/lib/storage";
import { useToast } from "@/components/ui/toast";
import { ImagePlus, X, ClipboardPaste } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WishlistItem, Currency } from "@/types";

const wishlistItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  price: z.string().optional(),
  description: z.string().optional(),
  link: z.string().url("Invalid URL").optional().or(z.literal("")),
});

type WishlistItemFormData = z.infer<typeof wishlistItemSchema>;

interface WishlistFormProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem?: WishlistItem | null;
}

export function WishlistForm({
  userId,
  open,
  onOpenChange,
  editItem,
}: WishlistFormProps) {
  const [images, setImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [currency, setCurrency] = useState<Currency>("USD");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  const createMutation = useCreateWishlistItem(userId);
  const updateMutation = useUpdateWishlistItem();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WishlistItemFormData>({
    resolver: zodResolver(wishlistItemSchema),
  });

  // Reset form and images when opening the sheet
  useEffect(() => {
    if (open) {
      reset({
        name: editItem?.name || "",
        price: editItem?.price?.toString() || "",
        description: editItem?.description || "",
        link: editItem?.link || "",
      });
      setImages(editItem?.images || []);
      setNewImages([]);
      setCurrency(editItem?.currency || "USD");
    }
  }, [open, editItem, reset]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length + newImages.length > 5) {
      alert("Maximum 5 images");
      return;
    }

    // Local image preview
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImages((prev) => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });

    setNewImages((prev) => [...prev, ...files]);
  };

  const handlePasteFromClipboard = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();

      for (const item of clipboardItems) {
        const imageType = item.types.find((type) => type.startsWith("image/"));
        if (imageType) {
          if (images.length + newImages.length >= 5) {
            addToast("Maximum 5 images", "error");
            return;
          }

          const blob = await item.getType(imageType);
          const file = new File([blob], `pasted-image-${Date.now()}.png`, {
            type: imageType,
          });

          const reader = new FileReader();
          reader.onload = (e) => {
            setImages((prev) => [...prev, e.target?.result as string]);
          };
          reader.readAsDataURL(file);

          setNewImages((prev) => [...prev, file]);
          return;
        }
      }

      addToast("No image found in clipboard", "error");
    } catch {
      // User cancelled the paste or clipboard access was denied - silently ignore
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    // If it's a new image (not existing), also remove from newImages
    const existingCount = editItem?.images?.length || 0;
    if (index >= existingCount) {
      setNewImages((prev) =>
        prev.filter((_, i) => i !== index - existingCount)
      );
    }
  };

  const onSubmit = async (data: WishlistItemFormData) => {
    setIsUploading(true);

    try {
      // Keep only existing images that weren't removed
      const existingImages = editItem?.images || [];
      const keptExistingImages = existingImages.filter((img) =>
        images.includes(img)
      );

      // Find images that were removed (to delete from storage)
      const removedImages = existingImages.filter(
        (img) => !images.includes(img)
      );

      // Delete removed images from storage
      if (removedImages.length > 0) {
        await deleteMultipleImages(removedImages);
      }

      // Upload new images if any
      const uploadedUrls =
        newImages.length > 0
          ? await uploadMultipleImages(userId, newImages)
          : [];

      const finalImages = [...keptExistingImages, ...uploadedUrls];

      const itemData = {
        name: data.name,
        images: finalImages.length > 0 ? finalImages : [],
        price: data.price ? parseFloat(data.price) : undefined,
        currency: data.price ? currency : undefined,
        description: data.description || undefined,
        link: data.link || undefined,
      };

      if (editItem) {
        await updateMutation.mutateAsync({
          itemId: editItem.id,
          data: itemData,
        });
      } else {
        await createMutation.mutateAsync(itemData);
      }

      handleClose();
    } catch (error) {
      console.error("Error saving item:", error);
      addToast("Error saving item. Please try again.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const isLoading =
    createMutation.isPending || updateMutation.isPending || isUploading;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{editItem ? "Edit Item" : "Add Item"}</SheetTitle>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4 mt-6"
        >
          <Input
            label="Name *"
            placeholder="e.g. PlayStation 5"
            error={errors.name?.message}
            {...register("name")}
          />

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-left">Images (max. 5)</label>
            <div className="flex flex-wrap gap-2">
              {images.map((img, index) => (
                <div
                  key={index}
                  className="relative w-20 h-20 rounded-xl overflow-hidden"
                >
                  <img
                    src={img}
                    alt={`Image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-black/50 rounded-full p-1"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}

              {images.length < 5 && (
                <>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 rounded-xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1 hover:border-primary transition-colors"
                  >
                    <ImagePlus className="w-5 h-5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Gallery</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePasteFromClipboard}
                    className="w-20 h-20 rounded-xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1 hover:border-primary transition-colors"
                  >
                    <ClipboardPaste className="w-5 h-5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Paste</span>
                  </button>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-left">Price (optional)</label>
            <div className="flex gap-2">
              <div className="flex bg-muted rounded-lg p-1 h-10">
                <button
                  type="button"
                  onClick={() => setCurrency("USD")}
                  className={cn(
                    "px-3 rounded-md transition-colors text-sm font-medium",
                    currency === "USD"
                      ? "bg-background shadow-sm"
                      : "hover:bg-background/50"
                  )}
                >
                  USD
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency("ARS")}
                  className={cn(
                    "px-3 rounded-md transition-colors text-sm font-medium",
                    currency === "ARS"
                      ? "bg-background shadow-sm"
                      : "hover:bg-background/50"
                  )}
                >
                  ARS
                </button>
              </div>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="e.g. 499"
                className="flex-1"
                {...register("price", {
                  onChange: (e) => {
                    e.target.value = e.target.value.replace(/[^0-9]/g, "");
                  },
                })}
              />
            </div>
          </div>

          <Textarea
            label="Description (optional)"
            placeholder="e.g. Black color, digital version"
            rows={3}
            {...register("description")}
          />

          <Input
            label="Link (optional)"
            type="url"
            placeholder="https://..."
            error={errors.link?.message}
            {...register("link")}
          />

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? (
                <Spinner size="sm" className="text-white" />
              ) : editItem ? (
                "Save"
              ) : (
                "Add"
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
