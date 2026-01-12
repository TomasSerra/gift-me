import * as React from "react";
import { cn } from "@/lib/utils";

interface PopoverContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const PopoverContext = React.createContext<PopoverContextValue | null>(null);

function usePopoverContext() {
  const context = React.useContext(PopoverContext);
  if (!context) {
    throw new Error("Popover components must be used within a Popover");
  }
  return context;
}

interface PopoverProps {
  children: React.ReactNode;
}

export function Popover({ children }: PopoverProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <PopoverContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">{children}</div>
    </PopoverContext.Provider>
  );
}

interface PopoverTriggerProps {
  children: React.ReactNode;
  className?: string;
}

export function PopoverTrigger({ children, className }: PopoverTriggerProps) {
  const { open, setOpen } = usePopoverContext();

  return (
    <button
      type="button"
      className={cn(
        "bg-black/60 text-white rounded-full p-2 hover:bg-black/80 transition-colors",
        className
      )}
      onClick={(e) => {
        e.stopPropagation();
        setOpen(!open);
      }}
    >
      {children}
    </button>
  );
}

interface PopoverContentProps {
  children: React.ReactNode;
  className?: string;
  align?: "start" | "end";
}

export function PopoverContent({
  children,
  className,
  align = "end",
}: PopoverContentProps) {
  const { open, setOpen } = usePopoverContext();
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        contentRef.current &&
        !contentRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    // Delay to avoid immediate close on same click
    const timer = setTimeout(() => {
      document.addEventListener("click", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handleClickOutside);
    };
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div
      ref={contentRef}
      className={cn(
        "absolute top-full mt-1 z-50 min-w-[120px] bg-popover border rounded-lg shadow-lg py-1",
        align === "end" ? "right-0" : "left-0",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

interface PopoverItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "default" | "destructive";
  className?: string;
}

export function PopoverItem({
  children,
  onClick,
  variant = "default",
  className,
}: PopoverItemProps) {
  const { setOpen } = usePopoverContext();

  return (
    <button
      type="button"
      className={cn(
        "w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2",
        variant === "destructive" && "text-destructive hover:text-destructive",
        className
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
        setOpen(false);
      }}
    >
      {children}
    </button>
  );
}
