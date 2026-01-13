import { useNavigate, useLocation } from "react-router-dom";
import { Home, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/profile", icon: User, label: "Profile" },
  { to: "/friends", icon: Users, label: "Friends" },
];

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-4 right-4 z-40 safe-area-bottom transform-gpu">
      <div className="flex items-center justify-between bg-card/80 backdrop-blur-lg rounded-full border shadow-lg p-2">
        {navItems.map((item) => {
          const active = isActive(item.to);
          return (
            <button
              key={item.to}
              onClick={() => navigate(item.to)}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 rounded-full py-2 transition-all active:scale-105",
                active
                  ? "bg-primary/50 text-primary-foreground"
                  : "text-muted-foreground"
              )}
            >
              <item.icon
                className={cn("w-6 h-6", active && "scale-110")}
                strokeWidth={active ? 2.5 : 2}
              />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
