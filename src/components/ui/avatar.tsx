import * as React from "react";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  firstName?: string;
  lastName?: string;
  photoURL?: string;
  id: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
  xl: "h-20 w-20 text-2xl",
};

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, firstName, lastName, photoURL, id, size = "md", ...props }, ref) => {
    const initials = getInitials(firstName, lastName);
    const colorClass = getAvatarColor(id);

    if (photoURL) {
      return (
        <div
          ref={ref}
          className={cn(
            "flex items-center justify-center rounded-full overflow-hidden",
            sizeClasses[size],
            className
          )}
          {...props}
        >
          <img
            src={photoURL}
            alt={`${firstName || ""} ${lastName || ""}`.trim() || "Profile"}
            className="w-full h-full object-cover"
          />
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-center rounded-full font-semibold text-white",
          colorClass,
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {initials}
      </div>
    );
  }
);
Avatar.displayName = "Avatar";

export { Avatar };
