import { Share2 } from "lucide-react";
import { shareContent, canNativeShare } from "@/lib/share";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface ShareButtonProps {
  url: string;
  title: string;
  text?: string;
  className?: string;
  variant?: "overlay" | "ghost" | "primary";
}

export function ShareButton({
  url,
  title,
  text,
  className,
  variant = "overlay",
}: ShareButtonProps) {
  const { addToast } = useToast();

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // Call share synchronously to preserve user gesture on iOS
    shareContent({ title, text, url }).then((success) => {
      if (success && !canNativeShare()) {
        addToast("Link copied to clipboard", "success");
      }
    });
  };

  if (variant === "ghost") {
    return (
      <button
        type="button"
        onClick={handleShare}
        className={cn(
          "p-2 rounded-full w-9 h-9 flex items-center justify-center hover:bg-accent transition-colors active:scale-[0.98]",
          className,
          "cursor-pointer"
        )}
      >
        <Share2 className="w-5 h-5 mr-0.5" />
      </button>
    );
  }

  if (variant === "primary") {
    return (
      <button
        type="button"
        onClick={handleShare}
        className={cn(
          "bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center hover:bg-primary/90 transition-colors active:scale-[0.98] cursor-pointer",
          className
        )}
      >
        <Share2 className="w-5 h-5 mr-0.5" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className={cn(
        "bg-black/60 text-white rounded-full w-9 h-9 flex items-center justify-center hover:bg-black/80 transition-colors active:scale-[0.98] cursor-pointer",
        className
      )}
    >
      <Share2 className="w-5 h-5 mr-0.5" />
    </button>
  );
}
