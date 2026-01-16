import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface SheetContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SheetContext = React.createContext<SheetContextValue | undefined>(
  undefined
);

function useSheet() {
  const context = React.useContext(SheetContext);
  if (!context) {
    throw new Error("useSheet must be used within a Sheet");
  }
  return context;
}

interface SheetProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function Sheet({ children, open: controlledOpen, onOpenChange }: SheetProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  return (
    <SheetContext.Provider value={{ open, setOpen }}>
      {children}
    </SheetContext.Provider>
  );
}

interface SheetTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

const SheetTrigger = React.forwardRef<HTMLButtonElement, SheetTriggerProps>(
  ({ children, asChild, onClick, ...props }, ref) => {
    const { setOpen } = useSheet();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      setOpen(true);
      onClick?.(e);
    };

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(
        children as React.ReactElement<{ onClick?: () => void }>,
        {
          onClick: () => setOpen(true),
        }
      );
    }

    return (
      <button ref={ref} onClick={handleClick} {...props}>
        {children}
      </button>
    );
  }
);
SheetTrigger.displayName = "SheetTrigger";

interface SheetContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: "top" | "bottom" | "left" | "right";
  noPadding?: boolean;
}

const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(
  (
    { className, children, side = "bottom", noPadding = false, ...props },
    ref
  ) => {
    const { open, setOpen } = useSheet();
    const [isVisible, setIsVisible] = React.useState(false);
    const [shouldRender, setShouldRender] = React.useState(false);
    // Capture the initial viewport height when opening to prevent keyboard resize issues
    const [initialHeight, setInitialHeight] = React.useState<number | null>(null);

    React.useEffect(() => {
      let timer: ReturnType<typeof setTimeout>;
      if (open) {
        // Capture height BEFORE keyboard opens (use visualViewport if available for accuracy)
        const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
        setInitialHeight(viewportHeight);
        setShouldRender(true);
        document.body.style.overflow = "hidden";
        // Small delay to trigger the enter animation after mount
        timer = setTimeout(() => {
          setIsVisible(true);
        }, 20);
      } else {
        setIsVisible(false);
        document.body.style.overflow = "";
        // Wait for exit animation to complete before unmounting
        timer = setTimeout(() => {
          setShouldRender(false);
          setInitialHeight(null);
        }, 300);
      }
      return () => clearTimeout(timer);
    }, [open]);

    React.useEffect(() => {
      return () => {
        document.body.style.overflow = "";
      };
    }, []);

    if (!shouldRender) return null;

    // Calculate max height based on initial viewport (90% of it)
    const maxHeightStyle = initialHeight ? { maxHeight: `${initialHeight * 0.9}px` } : {};

    const sideClasses = {
      top: "inset-x-0 top-0 border-b rounded-b-3xl overflow-y-auto scrollbar-hide",
      bottom:
        "inset-x-0 bottom-0 border-t rounded-t-3xl overflow-y-auto scrollbar-hide",
      left: "inset-y-0 left-0 h-full w-3/4 border-r",
      right: "inset-y-0 right-0 h-full w-3/4 border-l",
    };

    const closedTransform = {
      top: "-100%",
      bottom: "100%",
      left: "-100%",
      right: "100%",
    };

    const transformAxis = {
      top: "translateY",
      bottom: "translateY",
      left: "translateX",
      right: "translateX",
    };

    return (
      <>
        {/* Overlay */}
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300 touch-none"
          style={{ opacity: isVisible ? 1 : 0 }}
          onClick={() => setOpen(false)}
        />
        {/* Sheet */}
        <div
          ref={ref}
          className={cn(
            "fixed z-50 bg-background shadow-xl safe-area-bottom transition-transform duration-300 ease-out flex flex-col",
            sideClasses[side],
            className
          )}
          style={{
            transform: isVisible
              ? `${transformAxis[side]}(0)`
              : `${transformAxis[side]}(${closedTransform[side]})`,
          }}
          {...props}
        >
          {/* Fixed close button */}
          <div className="absolute right-4 top-4 z-20">
            <Button
              variant="secondary"
              size="icon"
              onClick={() => setOpen(false)}
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
          {/* Content */}
          <div
            className={cn(
              "flex-1 min-h-0 overscroll-contain",
              noPadding
                ? "flex flex-col"
                : "overflow-y-auto scrollbar-hide p-6 pb-10"
            )}
          >
            {children}
          </div>
        </div>
      </>
    );
  }
);
SheetContent.displayName = "SheetContent";

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )}
    {...props}
  />
);
SheetHeader.displayName = "SheetHeader";

const SheetTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-lg font-semibold text-foreground", className)}
    {...props}
  />
));
SheetTitle.displayName = "SheetTitle";

const SheetDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
SheetDescription.displayName = "SheetDescription";

const SheetClose = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ onClick, ...props }, ref) => {
  const { setOpen } = useSheet();
  return (
    <button
      ref={ref}
      onClick={(e) => {
        setOpen(false);
        onClick?.(e);
      }}
      {...props}
    />
  );
});
SheetClose.displayName = "SheetClose";

export {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
};
