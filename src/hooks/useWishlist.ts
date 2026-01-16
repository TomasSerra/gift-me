import {
  collection,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  writeBatch,
  onSnapshot,
} from "firebase/firestore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { deleteMultipleImages } from "@/lib/storage";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/contexts/AuthContext";
import { queryKeys } from "@/lib/queryKeys";
import type { WishlistItem, Currency } from "@/types";
import { useEffect, useState } from "react";

interface CreateWishlistItemData {
  name: string;
  images?: string[];
  price?: number;
  currency?: Currency;
  description?: string;
  links?: string[];
  folderIds?: string[];
}

interface UpdateWishlistItemData extends Partial<CreateWishlistItemData> {
  priority?: number;
}

export function useWishlist(userId: string) {
  const queryClient = useQueryClient();

  // Check for cached data to avoid showing loader on re-mount
  const cachedItems = queryClient.getQueryData<WishlistItem[]>(
    queryKeys.wishlist.user(userId)
  );

  const [items, setItems] = useState<WishlistItem[]>(cachedItems || []);
  const [loading, setLoading] = useState(!cachedItems);

  useEffect(() => {
    const q = query(
      collection(db, "wishlistItems"),
      where("ownerId", "==", userId),
      orderBy("priority", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newItems = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as WishlistItem[];
      setItems(newItems);
      setLoading(false);

      // Update React Query cache
      queryClient.setQueryData(queryKeys.wishlist.user(userId), newItems);

      // Cache individual items for detail page
      newItems.forEach((item) => {
        queryClient.setQueryData(queryKeys.wishlist.item(item.id), item);
      });
    });

    return () => unsubscribe();
  }, [userId, queryClient]);

  return { items, loading };
}

export function useCreateWishlistItem(userId: string) {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateWishlistItemData) => {
      // Use timestamp as initial priority
      const priority = Date.now();

      const itemData = {
        ownerId: userId,
        name: data.name,
        images: data.images || [],
        price: data.price || null,
        currency: data.currency || null,
        description: data.description || null,
        links: data.links || [],
        folderIds: data.folderIds || [],
        priority,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "wishlistItems"), itemData);

      // Create activity
      await addDoc(collection(db, "activity"), {
        userId,
        type: "item_added",
        wishlistItemId: docRef.id,
        itemName: data.name,
        itemDescription: data.description || null,
        itemImages: data.images || [],
        itemPrice: data.price || null,
        itemCurrency: data.currency || null,
        itemLinks: data.links || [],
        createdAt: serverTimestamp(),
      });

      return docRef.id;
    },
    onSuccess: () => {
      addToast("Item added to your wishlist", "success");
      queryClient.invalidateQueries({ queryKey: queryKeys.wishlist.user(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.activity.feed(userId) });
    },
    onError: () => {
      addToast("Error adding item", "error");
    },
  });
}

export function useUpdateWishlistItem() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      itemId,
      data,
    }: {
      itemId: string;
      data: UpdateWishlistItemData;
    }) => {
      if (!user) throw new Error("Not authenticated");
      // Convert undefined values to null for Firebase
      const updateData: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
      };

      for (const [key, value] of Object.entries(data)) {
        updateData[key] = value === undefined ? null : value;
      }

      await updateDoc(doc(db, "wishlistItems", itemId), updateData);

      // Also update the related activity entry to keep images in sync
      try {
        const activityQuery = query(
          collection(db, "activity"),
          where("userId", "==", user.id),
          where("wishlistItemId", "==", itemId)
        );
        const activitySnapshot = await getDocs(activityQuery);

        if (!activitySnapshot.empty) {
          const relatedActivity = activitySnapshot.docs[0];
          const activityUpdateData: Record<string, unknown> = {};

          if (data.name !== undefined) activityUpdateData.itemName = data.name;
          if (data.description !== undefined) activityUpdateData.itemDescription = data.description || null;
          if (data.images !== undefined) activityUpdateData.itemImages = data.images || [];
          if (data.price !== undefined) activityUpdateData.itemPrice = data.price || null;
          if (data.currency !== undefined) activityUpdateData.itemCurrency = data.currency || null;
          if (data.links !== undefined) activityUpdateData.itemLinks = data.links || [];

          if (Object.keys(activityUpdateData).length > 0) {
            await updateDoc(doc(db, "activity", relatedActivity.id), activityUpdateData);
          }
        }
      } catch (error) {
        console.warn("Could not update activity entry:", error);
      }
    },
    onSuccess: (_, { itemId }) => {
      addToast("Item updated", "success");
      queryClient.invalidateQueries({ queryKey: queryKeys.wishlist.item(itemId) });
      // Invalidate all activity feeds so friends see the updated data
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
    onError: () => {
      addToast("Error updating item", "error");
    },
  });
}

export function useDeleteWishlistItem() {
  const { addToast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      if (!user) throw new Error("No user");

      // Get the item to retrieve image URLs before deletion
      const itemDoc = await getDoc(doc(db, "wishlistItems", itemId));

      if (itemDoc.exists()) {
        const itemData = itemDoc.data() as WishlistItem;

        // Verify ownership
        if (itemData.ownerId !== user.id) {
          throw new Error("Not authorized to delete this item");
        }

        // Delete images from storage if any
        if (itemData.images && itemData.images.length > 0) {
          await deleteMultipleImages(itemData.images);
        }
      }

      // Delete the Firestore document first
      await deleteDoc(doc(db, "wishlistItems", itemId));

      // Try to delete related activity entries (don't fail if this doesn't work)
      try {
        const activityQuery = query(
          collection(db, "activity"),
          where("userId", "==", user.id),
          where("wishlistItemId", "==", itemId)
        );
        const activitySnapshot = await getDocs(activityQuery);

        if (!activitySnapshot.empty) {
          const deleteActivityPromises = activitySnapshot.docs.map((activityDoc) =>
            deleteDoc(doc(db, "activity", activityDoc.id))
          );
          await Promise.all(deleteActivityPromises);
        }
      } catch (error) {
        console.warn("Could not delete activity entries:", error);
      }

      // Try to delete related purchase entries (don't fail if this doesn't work)
      try {
        const purchaseQuery = query(
          collection(db, "purchases"),
          where("itemId", "==", itemId)
        );
        const purchaseSnapshot = await getDocs(purchaseQuery);

        if (!purchaseSnapshot.empty) {
          const deletePurchasePromises = purchaseSnapshot.docs.map((purchaseDoc) =>
            deleteDoc(doc(db, "purchases", purchaseDoc.id))
          );
          await Promise.all(deletePurchasePromises);
        }
      } catch (error) {
        console.warn("Could not delete purchase entries:", error);
      }
    },
    onSuccess: () => {
      addToast("Item deleted", "success");
      // Invalidate all activity feeds so friends see the deletion
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
    onError: () => {
      addToast("Error deleting item", "error");
    },
  });
}

export function useReorderWishlist(_userId: string) {
  return useMutation({
    mutationFn: async (items: WishlistItem[]) => {
      const batch = writeBatch(db);

      items.forEach((item, index) => {
        const itemRef = doc(db, "wishlistItems", item.id);
        batch.update(itemRef, { priority: index });
      });

      await batch.commit();
    },
    onSuccess: () => {
      // Cache is updated via onSnapshot
    },
  });
}
