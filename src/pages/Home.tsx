import { PageContainer } from "@/components/layout/PageContainer";
import { EventCarousel } from "@/components/home/EventCarousel";
import { ActivityFeed } from "@/components/home/ActivityFeed";
import { useAuth } from "@/contexts/AuthContext";

export function HomePage() {
  const { user } = useAuth();

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
    </PageContainer>
  );
}
