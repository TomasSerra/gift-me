import {
  collection,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  onSnapshot,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { useToast } from "@/components/ui/toast";
import { queryKeys } from "@/lib/queryKeys";
import type { Folder } from "@/types";
import { useEffect, useState } from "react";

export function useFolders(userId: string) {
  const queryClient = useQueryClient();

  const cachedFolders = queryClient.getQueryData<Folder[]>(
    queryKeys.folders.user(userId)
  );

  const [folders, setFolders] = useState<Folder[]>(cachedFolders || []);
  const [loading, setLoading] = useState(!cachedFolders);

  useEffect(() => {
    const q = query(
      collection(db, "folders"),
      where("ownerId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newFolders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Folder[];
      setFolders(newFolders);
      setLoading(false);

      queryClient.setQueryData(queryKeys.folders.user(userId), newFolders);
    });

    return () => unsubscribe();
  }, [userId, queryClient]);

  return { folders, loading };
}

export function useCreateFolder(userId: string) {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const folderData = {
        ownerId: userId,
        name,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "folders"), folderData);
      return docRef.id;
    },
    onSuccess: () => {
      addToast("Folder created", "success");
      queryClient.invalidateQueries({ queryKey: queryKeys.folders.user(userId) });
    },
    onError: () => {
      addToast("Error creating folder", "error");
    },
  });
}

export function useUpdateFolder() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      folderId,
      name,
    }: {
      folderId: string;
      name: string;
    }) => {
      await updateDoc(doc(db, "folders", folderId), {
        name,
        updatedAt: serverTimestamp(),
      });
    },
    onSuccess: (_, { folderId }) => {
      addToast("Folder updated", "success");
      queryClient.invalidateQueries({ queryKey: queryKeys.folders.detail(folderId) });
    },
    onError: () => {
      addToast("Error updating folder", "error");
    },
  });
}

export function useDeleteFolder(userId: string) {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (folderId: string) => {
      // Remove folderId from all items that have it
      const itemsQuery = query(
        collection(db, "wishlistItems"),
        where("ownerId", "==", userId),
        where("folderIds", "array-contains", folderId)
      );
      const itemsSnapshot = await getDocs(itemsQuery);

      const updatePromises = itemsSnapshot.docs.map((itemDoc) =>
        updateDoc(doc(db, "wishlistItems", itemDoc.id), {
          folderIds: arrayRemove(folderId),
        })
      );
      await Promise.all(updatePromises);

      // Delete the folder
      await deleteDoc(doc(db, "folders", folderId));
    },
    onSuccess: () => {
      addToast("Folder deleted", "success");
      queryClient.invalidateQueries({ queryKey: queryKeys.folders.user(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.wishlist.user(userId) });
    },
    onError: () => {
      addToast("Error deleting folder", "error");
    },
  });
}

export function useUpdateItemFolders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      folderIds,
    }: {
      itemId: string;
      folderIds: string[];
    }) => {
      await updateDoc(doc(db, "wishlistItems", itemId), {
        folderIds,
        updatedAt: serverTimestamp(),
      });
    },
    onSuccess: (_, { itemId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wishlist.item(itemId) });
    },
  });
}

export function useAddItemToFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      folderId,
    }: {
      itemId: string;
      folderId: string;
    }) => {
      await updateDoc(doc(db, "wishlistItems", itemId), {
        folderIds: arrayUnion(folderId),
        updatedAt: serverTimestamp(),
      });
    },
    onSuccess: (_, { itemId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wishlist.item(itemId) });
    },
  });
}

export function useRemoveItemFromFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      folderId,
    }: {
      itemId: string;
      folderId: string;
    }) => {
      await updateDoc(doc(db, "wishlistItems", itemId), {
        folderIds: arrayRemove(folderId),
        updatedAt: serverTimestamp(),
      });
    },
    onSuccess: (_, { itemId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wishlist.item(itemId) });
    },
  });
}
