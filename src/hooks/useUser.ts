import { doc, updateDoc, Timestamp } from "firebase/firestore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/toast";

interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  birthday?: Date | null;
  photoURL?: string;
}

export function useUpdateUser() {
  const { user, refreshUser } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateUserData) => {
      if (!user) throw new Error("No user");

      const updateData: Record<string, unknown> = {};

      if (data.firstName !== undefined) {
        updateData.firstName = data.firstName || null;
      }
      if (data.lastName !== undefined) {
        updateData.lastName = data.lastName || null;
      }
      if (data.birthday !== undefined) {
        updateData.birthday = data.birthday
          ? Timestamp.fromDate(data.birthday)
          : null;
      }
      if (data.photoURL !== undefined) {
        updateData.photoURL = data.photoURL;
      }

      await updateDoc(doc(db, "users", user.id), updateData);
      await refreshUser();
    },
    onSuccess: () => {
      addToast("Profile updated", "success");
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
    onError: () => {
      addToast("Error updating profile", "error");
    },
  });
}
