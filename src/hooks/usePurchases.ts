import {
  collection,
  query,
  where,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/contexts/AuthContext";
import { queryKeys } from "@/lib/queryKeys";
import type { Purchase } from "@/types";
import { useEffect, useState } from "react";

/**
 * Fetches all purchases for items owned by a specific user.
 * Used when viewing a friend's profile to see which items have been purchased.
 */
export function usePurchases(itemOwnerId: string) {
  const queryClient = useQueryClient();

  const cachedPurchases = queryClient.getQueryData<Purchase[]>(
    queryKeys.purchases.byOwner(itemOwnerId)
  );

  const [purchases, setPurchases] = useState<Purchase[]>(cachedPurchases || []);
  const [loading, setLoading] = useState(!cachedPurchases);

  useEffect(() => {
    if (!itemOwnerId) {
      setPurchases([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "purchases"),
      where("itemOwnerId", "==", itemOwnerId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newPurchases = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Purchase[];
      setPurchases(newPurchases);
      setLoading(false);

      queryClient.setQueryData(
        queryKeys.purchases.byOwner(itemOwnerId),
        newPurchases
      );
    });

    return () => unsubscribe();
  }, [itemOwnerId, queryClient]);

  return { purchases, loading };
}

/**
 * Creates a purchase record to mark an item as bought.
 */
export function useCreatePurchase() {
  const { addToast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      itemOwnerId,
    }: {
      itemId: string;
      itemOwnerId: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      // Build buyer name from user data
      const buyerName =
        user.firstName || user.lastName
          ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
          : user.username || "Someone";

      const purchaseData = {
        itemId,
        itemOwnerId,
        buyerId: user.id,
        buyerName,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "purchases"), purchaseData);
      return docRef.id;
    },
    onSuccess: (_, { itemOwnerId }) => {
      addToast("Item marked as purchased", "success");
      queryClient.invalidateQueries({
        queryKey: queryKeys.purchases.byOwner(itemOwnerId),
      });
    },
    onError: (error) => {
      if (error instanceof Error && error.message.includes("already been purchased")) {
        addToast("This item has already been purchased by someone else", "error");
      } else {
        addToast("Error marking item as purchased", "error");
      }
    },
  });
}

/**
 * Deletes a purchase record (cancels the purchase).
 */
export function useDeletePurchase() {
  const { addToast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      purchaseId,
      itemOwnerId,
    }: {
      purchaseId: string;
      itemOwnerId: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      await deleteDoc(doc(db, "purchases", purchaseId));
      return itemOwnerId;
    },
    onSuccess: (itemOwnerId) => {
      addToast("Purchase cancelled", "success");
      queryClient.invalidateQueries({
        queryKey: queryKeys.purchases.byOwner(itemOwnerId),
      });
    },
    onError: () => {
      addToast("Error cancelling purchase", "error");
    },
  });
}
