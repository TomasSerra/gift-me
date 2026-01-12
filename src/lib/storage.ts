import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import imageCompression from "browser-image-compression";
import { storage } from "./firebase";

const compressionOptions = {
  maxSizeMB: 0.5,
  maxWidthOrHeight: 1024,
  useWebWorker: true,
  fileType: "image/webp" as const,
};

const profilePhotoCompressionOptions = {
  maxSizeMB: 0.3,
  maxWidthOrHeight: 512,
  useWebWorker: true,
  fileType: "image/webp" as const,
};

export async function uploadProfilePhoto(
  userId: string,
  file: File
): Promise<string> {
  const compressedFile = await imageCompression(file, profilePhotoCompressionOptions);

  const fileName = `profile.webp`;
  const storageRef = ref(storage, `users/${userId}/${fileName}`);
  await uploadBytes(storageRef, compressedFile);

  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
}

export async function uploadWishlistImage(
  userId: string,
  file: File
): Promise<string> {
  // Comprimir imagen
  const compressedFile = await imageCompression(file, compressionOptions);

  // Generar nombre único
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  const extension = "webp";
  const fileName = `${timestamp}_${randomId}.${extension}`;

  // Subir a Firebase Storage
  const storageRef = ref(storage, `users/${userId}/wishlist/${fileName}`);
  await uploadBytes(storageRef, compressedFile);

  // Obtener URL
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
}

export async function uploadMultipleImages(
  userId: string,
  files: File[]
): Promise<string[]> {
  const uploadPromises = files.map((file) => uploadWishlistImage(userId, file));
  return Promise.all(uploadPromises);
}

/**
 * Extract storage path from Firebase Storage download URL
 */
function getPathFromUrl(downloadUrl: string): string | null {
  try {
    const url = new URL(downloadUrl);
    // Firebase Storage URLs have the path encoded in the pathname after /o/
    const match = url.pathname.match(/\/o\/(.+)/);
    if (match) {
      return decodeURIComponent(match[1]);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Delete a single image from Firebase Storage
 */
export async function deleteWishlistImage(downloadUrl: string): Promise<void> {
  const path = getPathFromUrl(downloadUrl);
  if (!path) {
    console.warn("Could not extract path from URL:", downloadUrl);
    return;
  }

  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
}

/**
 * Delete multiple images from Firebase Storage
 */
export async function deleteMultipleImages(downloadUrls: string[]): Promise<void> {
  const deletePromises = downloadUrls.map((url) =>
    deleteWishlistImage(url).catch((error) => {
      // Log but don't fail if individual image deletion fails
      console.warn("Failed to delete image:", url, error);
    })
  );
  await Promise.all(deletePromises);
}
