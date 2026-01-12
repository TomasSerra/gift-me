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
import type { WishlistItem } from "@/types";
import { useEffect, useState } from "react";

interface CreateWishlistItemData {
  name: string;
  images?: string[];
  price?: number;
  description?: string;
  link?: string;
}

interface UpdateWishlistItemData extends Partial<CreateWishlistItemData> {
  priority?: number;
}

export function useWishlist(userId: string) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

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
    });

    return () => unsubscribe();
  }, [userId]);

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
        description: data.description || null,
        link: data.link || null,
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
        itemLink: data.link || null,
        createdAt: serverTimestamp(),
      });

      return docRef.id;
    },
    onSuccess: () => {
      addToast("Item added to your wishlist", "success");
      queryClient.invalidateQueries({ queryKey: ["wishlist", userId] });
    },
    onError: () => {
      addToast("Error adding item", "error");
    },
  });
}

export function useUpdateWishlistItem() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      data,
    }: {
      itemId: string;
      data: UpdateWishlistItemData;
    }) => {
      const updateData: Record<string, unknown> = {
        ...data,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, "wishlistItems", itemId), updateData);
    },
    onSuccess: () => {
      addToast("Item updated", "success");
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
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
        // Query only by userId (has index) and filter in memory
        const activityQuery = query(
          collection(db, "activity"),
          where("userId", "==", user.id)
        );
        const activitySnapshot = await getDocs(activityQuery);
        const relatedActivities = activitySnapshot.docs.filter(
          (activityDoc) => activityDoc.data().wishlistItemId === itemId
        );
        const deleteActivityPromises = relatedActivities.map((activityDoc) =>
          deleteDoc(doc(db, "activity", activityDoc.id))
        );
        await Promise.all(deleteActivityPromises);
      } catch (error) {
        console.warn("Could not delete activity entries:", error);
      }
    },
    onSuccess: () => {
      addToast("Item deleted", "success");
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    },
    onError: () => {
      addToast("Error deleting item", "error");
    },
  });
}

export function useReorderWishlist(userId: string) {
  const queryClient = useQueryClient();

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
      queryClient.invalidateQueries({ queryKey: ["wishlist", userId] });
    },
  });
}
