import { NavLink } from "react-router-dom";
import { Home, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/profile", icon: User, label: "Profile" },
  { to: "/friends", icon: Users, label: "Friends" },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-4 left-4 right-4 z-40 safe-area-bottom">
      <div className="flex items-center justify-around bg-card/80 backdrop-blur-lg rounded-full border shadow-lg py-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center py-2 px-8 rounded-full transition-all",
                isActive
                  ? "bg-primary/50 text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={cn("w-6 h-6", isActive && "scale-110")}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className="text-xs mt-1 font-medium">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
