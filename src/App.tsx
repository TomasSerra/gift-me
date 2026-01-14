import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { BottomNav } from "@/components/layout/BottomNav";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import { AuthPage } from "@/pages/Auth";
import { HomePage } from "@/pages/Home";
import { ProfilePage } from "@/pages/Profile";
import { FriendsPage } from "@/pages/Friends";
import { FriendProfilePage } from "@/pages/FriendProfile";
import { WishlistItemDetailPage } from "@/pages/WishlistItemDetail";
import { PublicProfilePage } from "@/pages/PublicProfile";
import { Spinner } from "@/components/ui/spinner";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <BottomNav />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route
          path="/auth"
          element={
            <AuthRoute>
              <AuthPage />
            </AuthRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout>
                <HomePage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <AppLayout>
                <ProfilePage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/friends"
          element={
            <ProtectedRoute>
              <AppLayout>
                <FriendsPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/friends/:userId"
          element={
            <ProtectedRoute>
              <FriendProfilePage />
            </ProtectedRoute>
          }
        />
        <Route path="/item/:itemId" element={<WishlistItemDetailPage />} />
        <Route path="/u/:username" element={<PublicProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
