export interface ShareData {
  title: string;
  text?: string;
  url: string;
}

export function shareContent(data: ShareData): Promise<boolean> {
  // Check if Web Share API is available
  if (typeof navigator.share === "function") {
    // Call navigator.share synchronously from user gesture
    // Don't use async/await here to preserve the user gesture chain on iOS
    return navigator
      .share({
        title: data.title,
        text: data.text,
        url: data.url,
      })
      .then(() => true)
      .catch((error) => {
        // User cancelled or error occurred
        if (error.name !== "AbortError") {
          console.error("Error sharing:", error);
        }
        return false;
      });
  }

  // Fallback: copy to clipboard
  return navigator.clipboard
    .writeText(data.url)
    .then(() => true)
    .catch((error) => {
      console.error("Error copying to clipboard:", error);
      return false;
    });
}

export function canNativeShare(): boolean {
  return typeof navigator.share === "function";
}
