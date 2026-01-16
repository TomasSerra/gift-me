import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  useCreateWishlistItem,
  useUpdateWishlistItem,
} from "@/hooks/useWishlist";
import { uploadMultipleImages, deleteMultipleImages } from "@/lib/storage";
import { useToast } from "@/components/ui/toast";
import { useFolders } from "@/hooks/useFolders";
import { FolderPicker } from "./FolderPicker";
import {
  ImagePlus,
  X,
  ClipboardPaste,
  FolderPlus,
  Plus,
  Link,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WishlistItem, Currency } from "@/types";

const wishlistItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  price: z.string().optional(),
  description: z.string().optional(),
});

type WishlistItemFormData = z.infer<typeof wishlistItemSchema>;

interface ImageItem {
  id: string;
  src: string;
  file: File | null; // null if existing image
}

interface SortableImageProps {
  image: ImageItem;
  onRemove: () => void;
  disabled: boolean;
}

function SortableImage({ image, onRemove, disabled }: SortableImageProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative w-20 h-20 rounded-xl overflow-hidden touch-none",
        isDragging && "opacity-50 z-10"
      )}
      {...attributes}
      {...listeners}
    >
      <img
        src={image.src}
        alt="Image"
        className="w-full h-full object-cover pointer-events-none"
      />
      {!disabled && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-1 right-1 bg-black/50 rounded-full p-1"
        >
          <X className="w-3 h-3 text-white" />
        </button>
      )}
    </div>
  );
}

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
  const [imageItems, setImageItems] = useState<ImageItem[]>([]);
  const [currency, setCurrency] = useState<Currency>("ARS");
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);
  const [links, setLinks] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();
  const { folders } = useFolders(userId);

  const createMutation = useCreateWishlistItem(userId);
  const updateMutation = useUpdateWishlistItem();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<WishlistItemFormData>({
    resolver: zodResolver(wishlistItemSchema),
  });

  const nameValue = watch("name");

  // Reset form and images when opening the sheet
  useEffect(() => {
    if (open) {
      reset({
        name: editItem?.name || "",
        price: editItem?.price?.toString() || "",
        description: editItem?.description || "",
      });
      // Convert existing images to ImageItem format
      const existingImages: ImageItem[] = (editItem?.images || []).map(
        (src, index) => ({
          id: `existing-${index}-${src}`,
          src,
          file: null,
        })
      );
      setImageItems(existingImages);
      setCurrency(editItem?.currency || "ARS");
      setSelectedFolderIds(editItem?.folderIds || []);
      // Load existing links (support both old 'link' and new 'links' field)
      const existingLinks =
        editItem?.links || (editItem?.link ? [editItem.link] : []);
      setLinks(existingLinks);
    }
  }, [open, editItem, reset]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + imageItems.length > 5) {
      alert("Maximum 5 images");
      return;
    }

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newImage: ImageItem = {
          id: `new-${Date.now()}-${Math.random()}`,
          src: e.target?.result as string,
          file,
        };
        setImageItems((prev) => [...prev, newImage]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input so the same file can be selected again
    e.target.value = "";
  };

  const handlePasteFromClipboard = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();

      for (const item of clipboardItems) {
        const imageType = item.types.find((type) => type.startsWith("image/"));
        if (imageType) {
          if (imageItems.length >= 5) {
            addToast("Maximum 5 images", "error");
            return;
          }

          const blob = await item.getType(imageType);
          const file = new File([blob], `pasted-image-${Date.now()}.png`, {
            type: imageType,
          });

          const reader = new FileReader();
          reader.onload = (e) => {
            const newImage: ImageItem = {
              id: `new-${Date.now()}-${Math.random()}`,
              src: e.target?.result as string,
              file,
            };
            setImageItems((prev) => [...prev, newImage]);
          };
          reader.readAsDataURL(file);
          return;
        }
      }

      addToast("No image found in clipboard", "error");
    } catch {
      // User cancelled the paste or clipboard access was denied - silently ignore
    }
  };

  const removeImage = (id: string) => {
    setImageItems((prev) => prev.filter((img) => img.id !== id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setImageItems((prev) => {
        const oldIndex = prev.findIndex((img) => img.id === active.id);
        const newIndex = prev.findIndex((img) => img.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          const newItems = [...prev];
          const [movedItem] = newItems.splice(oldIndex, 1);
          newItems.splice(newIndex, 0, movedItem);
          return newItems;
        }
        return prev;
      });
    }
  };

  const onSubmit = async (data: WishlistItemFormData) => {
    setIsUploading(true);

    try {
      const existingImages = editItem?.images || [];

      // Find existing images that were removed
      const keptExistingUrls = imageItems
        .filter((img) => img.file === null)
        .map((img) => img.src);

      const removedImages = existingImages.filter(
        (url) => !keptExistingUrls.includes(url)
      );

      // Delete removed images from storage
      if (removedImages.length > 0) {
        await deleteMultipleImages(removedImages);
      }

      // Upload new images
      const newFiles = imageItems
        .filter((img) => img.file !== null)
        .map((img) => img.file!);

      const uploadedUrls =
        newFiles.length > 0 ? await uploadMultipleImages(userId, newFiles) : [];

      // Build final images array in the correct order
      let uploadIndex = 0;
      const finalImages = imageItems.map((img) => {
        if (img.file === null) {
          return img.src; // existing image URL
        } else {
          return uploadedUrls[uploadIndex++]; // new uploaded URL
        }
      });

      // Filter out empty links and validate URLs
      const validLinks = links.filter((link) => {
        if (!link.trim()) return false;
        try {
          new URL(link);
          return true;
        } catch {
          return false;
        }
      });

      const itemData = {
        name: data.name,
        images: finalImages.length > 0 ? finalImages : [],
        price: data.price ? parseFloat(data.price) : undefined,
        currency: data.price ? currency : undefined,
        description: data.description || undefined,
        links: validLinks.length > 0 ? validLinks : undefined,
        folderIds: selectedFolderIds.length > 0 ? selectedFolderIds : undefined,
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
      <SheetContent noPadding>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col h-full min-h-0"
        >
          {/* Fixed header */}
          <div className="shrink-0 px-6 pt-4 pb-4 border-b flex items-center min-h-[75px] bg-background">
            <h2 className="text-lg font-semibold flex-1 text-center">
              {editItem ? "Edit Item" : "Add Item"}
            </h2>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide overscroll-contain px-6 py-4 flex flex-col gap-4">
            <Input
              label="Name *"
              placeholder="e.g. PlayStation 5"
              error={errors.name?.message}
              disabled={isLoading}
              {...register("name")}
            />

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-left">
                Images (max. 5)
              </label>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={imageItems.map((img) => img.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="flex flex-wrap gap-2">
                    {imageItems.map((img) => (
                      <SortableImage
                        key={img.id}
                        image={img}
                        onRemove={() => removeImage(img.id)}
                        disabled={isLoading}
                      />
                    ))}

                    {imageItems.length < 5 && !isLoading && (
                      <>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-20 h-20 rounded-xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1 hover:border-primary transition-colors"
                        >
                          <ImagePlus className="w-5 h-5 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">
                            Gallery
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={handlePasteFromClipboard}
                          className="w-20 h-20 rounded-xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1 hover:border-primary transition-colors"
                        >
                          <ClipboardPaste className="w-5 h-5 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">
                            Paste
                          </span>
                        </button>
                      </>
                    )}
                  </div>
                </SortableContext>
              </DndContext>
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
              <label className="text-sm font-medium text-left">
                Price (optional)
              </label>
              <div className="flex gap-2">
                <div className="flex bg-muted rounded-lg p-1 h-10">
                  <button
                    type="button"
                    onClick={() => setCurrency("ARS")}
                    disabled={isLoading}
                    className={cn(
                      "px-3 rounded-md transition-colors text-sm font-medium",
                      currency === "ARS"
                        ? "bg-background shadow-sm"
                        : "hover:bg-background/50",
                      isLoading && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    ARS
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrency("USD")}
                    disabled={isLoading}
                    className={cn(
                      "px-3 rounded-md transition-colors text-sm font-medium",
                      currency === "USD"
                        ? "bg-background shadow-sm"
                        : "hover:bg-background/50",
                      isLoading && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    USD
                  </button>
                </div>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="e.g. 499"
                  className="flex-1"
                  disabled={isLoading}
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
              disabled={isLoading}
              {...register("description")}
            />

            {/* Links section */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-left">
                Links (optional)
              </label>
              {links.map((link, index) => (
                <div key={index} className="flex gap-2">
                  <div className="relative flex-1">
                    <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="url"
                      placeholder="https://..."
                      value={link}
                      onChange={(e) => {
                        const newLinks = [...links];
                        newLinks[index] = e.target.value;
                        setLinks(newLinks);
                      }}
                      disabled={isLoading}
                      className="pl-9"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const newLinks = links.filter((_, i) => i !== index);
                      setLinks(newLinks);
                    }}
                    disabled={isLoading}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLinks([...links, ""])}
                disabled={isLoading}
                className="w-fit"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add link
              </Button>
            </div>

            {/* Folders selector */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-left">
                Folders (optional)
              </label>
              <Button
                type="button"
                variant="outline"
                className="justify-start"
                disabled={isLoading}
                onClick={() => setFolderPickerOpen(true)}
              >
                <FolderPlus className="w-4 h-4 mr-2" />
                {selectedFolderIds.length === 0
                  ? "Add to folders"
                  : `${selectedFolderIds.length} folder${
                      selectedFolderIds.length > 1 ? "s" : ""
                    } selected`}
              </Button>
              {selectedFolderIds.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedFolderIds.map((folderId) => {
                    const folder = folders.find((f) => f.id === folderId);
                    if (!folder) return null;
                    return (
                      <span
                        key={folderId}
                        className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full"
                      >
                        {folder.name}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Fixed footer */}
          <div className="shrink-0 px-6 pt-4 pb-6 border-t bg-background">
            <Button type="submit" className="w-full" disabled={isLoading || !nameValue?.trim()}>
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

        <FolderPicker
          userId={userId}
          open={folderPickerOpen}
          onOpenChange={setFolderPickerOpen}
          selectedFolderIds={selectedFolderIds}
          onSelectionChange={setSelectedFolderIds}
        />
      </SheetContent>
    </Sheet>
  );
}
