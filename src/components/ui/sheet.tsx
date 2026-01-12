import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface SheetTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
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
      return React.cloneElement(children as React.ReactElement<{ onClick?: () => void }>, {
        onClick: () => setOpen(true),
      });
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
}

const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(
  ({ className, children, side = "bottom", ...props }, ref) => {
    const { open, setOpen } = useSheet();
    const [isVisible, setIsVisible] = React.useState(false);
    const [shouldRender, setShouldRender] = React.useState(false);

    React.useEffect(() => {
      let timer: ReturnType<typeof setTimeout>;
      if (open) {
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

    const sideClasses = {
      top: "inset-x-0 top-0 border-b rounded-b-3xl",
      bottom: "inset-x-0 bottom-0 border-t rounded-t-3xl",
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
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
          style={{ opacity: isVisible ? 1 : 0 }}
          onClick={() => setOpen(false)}
        />
        {/* Sheet */}
        <div
          ref={ref}
          className={cn(
            "fixed z-50 bg-background p-6 shadow-xl safe-area-bottom transition-transform duration-300 ease-out",
            sideClasses[side],
            className
          )}
          style={{
            transform: isVisible ? `${transformAxis[side]}(0)` : `${transformAxis[side]}(${closedTransform[side]})`,
          }}
          {...props}
        >
          <button
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 rounded-full p-2 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </button>
          {children}
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
    className={cn("flex flex-col space-y-2 text-center sm:text-left", className)}
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
