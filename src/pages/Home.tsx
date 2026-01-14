import { useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { EventCarousel } from "@/components/home/EventCarousel";
import { ActivityFeed } from "@/components/home/ActivityFeed";
import { WishlistForm } from "@/components/wishlist/WishlistForm";
import { useAuth } from "@/contexts/AuthContext";
import { Plus } from "lucide-react";

export function HomePage() {
  const { user } = useAuth();
  const [formOpen, setFormOpen] = useState(false);

  const header = (
    <div className="flex items-center gap-3 p-4">
      <img src="/logo.png" alt="GiftMe" className="w-10 h-10" />
      <div>
        <h1 className="text-lg font-semibold">GiftMe</h1>
        <p className="text-xs text-muted-foreground">
          Hello, {user?.firstName || user?.username}
        </p>
      </div>
    </div>
  );

  return (
    <PageContainer header={header} noPadding>
      <div className="space-y-6 py-4">
        <EventCarousel />
        <ActivityFeed />
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setFormOpen(true)}
        className="fixed right-4 bottom-32 z-50 w-16 h-16 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 active:scale-90 transition-transform duration-150"
      >
        <Plus className="w-7 h-7" strokeWidth={2.5} />
      </button>

      {user && (
        <WishlistForm
          userId={user.id}
          open={formOpen}
          onOpenChange={setFormOpen}
        />
      )}
    </PageContainer>
  );
}
