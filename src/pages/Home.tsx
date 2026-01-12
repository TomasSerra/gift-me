import { PageContainer } from "@/components/layout/PageContainer";
import { EventCarousel } from "@/components/home/EventCarousel";
import { ActivityFeed } from "@/components/home/ActivityFeed";
import { useAuth } from "@/contexts/AuthContext";
import { Gift } from "lucide-react";

export function HomePage() {
  const { user } = useAuth();

  const header = (
    <div className="flex items-center gap-3 p-4">
      <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
        <Gift className="w-5 h-5 text-white" />
      </div>
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
