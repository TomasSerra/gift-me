import { useState } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

type AuthView = "login" | "register" | "forgot-password";

export function AuthPage() {
  const [view, setView] = useState<AuthView>("login");

  const isRegister = view === "register";

  return (
    <div
      className={`min-h-dvh flex flex-col items-center p-6 bg-background ${
        isRegister ? "overflow-y-auto py-12" : "h-dvh justify-center overflow-hidden"
      }`}
    >
      {/* Logo */}
      <div className={`flex items-center gap-3 ${isRegister ? "mb-6 mt-auto" : "mb-8"}`}>
        <img src="/logo.png" alt="GiftMe" className="w-14 h-14" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">GiftMe</h1>
          <p className="text-sm text-muted-foreground">Your social wishlist</p>
        </div>
      </div>

      {/* Forms */}
      <div className={`w-full max-w-sm ${isRegister ? "mb-auto" : ""}`}>
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
