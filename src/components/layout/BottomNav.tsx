import { useNavigate, useLocation } from "react-router-dom";
import { Home, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/friends", icon: Users, label: "Friends" },
  { to: "/profile", icon: User, label: "Profile" },
];

// Detect if app is installed as PWA
const isStandalone =
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveIndex = () => {
    if (location.pathname === "/") return 0;
    if (location.pathname.startsWith("/friends")) return 1;
    if (location.pathname.startsWith("/profile")) return 2;
    return 0;
  };

  const activeIndex = getActiveIndex();

  return (
    <nav
      className={cn(
        "fixed left-4 right-4 z-40 safe-area-bottom transform-gpu",
        isStandalone ? "bottom-0" : "bottom-4"
      )}
    >
      <div className="relative flex items-center justify-between bg-card/80 backdrop-blur-lg rounded-full border shadow-lg p-2">
        {/* Sliding background */}
        <div
          className="absolute top-2 bottom-2 rounded-full bg-primary/50 transition-transform duration-300 ease-out"
          style={{
            width: `calc((100% - 16px) / ${navItems.length})`,
            transform: `translateX(calc(${activeIndex} * 100%))`,
          }}
        />

        {navItems.map((item, index) => {
          const active = index === activeIndex;
          return (
            <button
              key={item.to}
              onClick={() => navigate(item.to)}
              className={cn(
                "relative z-10 flex flex-1 flex-col items-center justify-center gap-1 rounded-full py-2 transition-colors active:scale-105",
                active ? "text-primary-foreground" : "text-muted-foreground"
              )}
            >
              <item.icon
                className={cn("w-6 h-6 transition-transform", active && "scale-110")}
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
