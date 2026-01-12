import { useState } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { Gift } from "lucide-react";

type AuthView = "login" | "register" | "forgot-password";

export function AuthPage() {
  const [view, setView] = useState<AuthView>("login");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center">
          <Gift className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">GiftMe</h1>
          <p className="text-sm text-muted-foreground">Your social wishlist</p>
        </div>
      </div>

      {/* Forms */}
      <div className="w-full max-w-sm">
        {view === "login" && (
          <LoginForm
            onRegister={() => setView("register")}
            onForgotPassword={() => setView("forgot-password")}
          />
        )}
        {view === "register" && (
          <RegisterForm onLogin={() => setView("login")} />
        )}
        {view === "forgot-password" && (
          <ForgotPasswordForm onBack={() => setView("login")} />
        )}
      </div>
    </div>
  );
}
