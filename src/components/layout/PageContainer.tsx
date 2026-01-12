import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  header?: ReactNode;
  noPadding?: boolean;
}

export function PageContainer({
  children,
  className,
  header,
  noPadding = false,
}: PageContainerProps) {
  return (
    <div className="min-h-screen bg-background pb-24">
      {header && (
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b safe-area-top">
          {header}
        </header>
      )}
      <main
        className={cn(
          "flex-1",
          !noPadding && "p-4",
          className
        )}
      >
        {children}
      </main>
    </div>
  );
}
