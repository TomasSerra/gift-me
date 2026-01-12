import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/toast";
import { Timestamp } from "firebase/firestore";

const registerSchema = z
  .object({
    email: z.email("Invalid email"),
    username: z
      .string()
      .min(3, "Minimum 3 characters")
      .max(20, "Maximum 20 characters")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Only letters, numbers and underscores"
      ),
    password: z.string().min(6, "Minimum 6 characters"),
    confirmPassword: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    birthday: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

interface RegisterFormProps {
  onLogin: () => void;
}

export function RegisterForm({ onLogin }: RegisterFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(
    null
  );
  const { register: authRegister, checkUsernameAvailable } = useAuth();
  const { addToast } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const username = watch("username");

  const handleUsernameBlur = async () => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    setIsCheckingUsername(true);
    try {
      const available = await checkUsernameAvailable(username);
      setUsernameAvailable(available);
    } catch {
      setUsernameAvailable(null);
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const onSubmit = async (data: RegisterFormData) => {
    if (usernameAvailable === false) {
      addToast("Username is already taken", "error");
      return;
    }

    setIsLoading(true);
    try {
      const birthday = data.birthday
        ? Timestamp.fromDate(new Date(data.birthday))
        : undefined;

      await authRegister(
        data.email,
        data.password,
        data.username,
        data.firstName,
        data.lastName,
        birthday?.toDate()
      );
      addToast("Account created successfully!", "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error signing up";
      if (message.includes("email-already-in-use")) {
        addToast("Email is already registered", "error");
      } else {
        addToast(message, "error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getUsernameError = () => {
    if (errors.username) return errors.username.message;
    if (usernameAvailable === false) return "Username not available";
    return undefined;
  };

  const getUsernameHint = () => {
    if (usernameAvailable === true && !errors.username) return "Username available";
    return undefined;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center">Create Account</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email *"
            type="email"
            placeholder="you@email.com"
            autoComplete="email"
            error={errors.email?.message}
            {...register("email")}
          />

          <div className="relative">
            <Input
              label="Username *"
              type="text"
              placeholder="your_username"
              autoComplete="username"
              error={getUsernameError()}
              {...register("username")}
              onBlur={handleUsernameBlur}
            />
            {isCheckingUsername && (
              <div className="absolute right-3 top-9">
                <Spinner size="sm" />
              </div>
            )}
            {getUsernameHint() && (
              <p className="text-sm text-green-600 mt-1">{getUsernameHint()}</p>
            )}
          </div>

          <Input
            label="Password *"
            type="password"
            placeholder="••••••"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register("password")}
          />

          <Input
            label="Confirm Password *"
            type="password"
            placeholder="••••••"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              type="text"
              placeholder="John"
              autoComplete="given-name"
              {...register("firstName")}
            />
            <Input
              label="Last Name"
              type="text"
              placeholder="Doe"
              autoComplete="family-name"
              {...register("lastName")}
            />
          </div>

          <Input
            label="Birthday"
            type="date"
            {...register("birthday")}
          />

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <Spinner size="sm" className="text-white" />
            ) : (
              "Create Account"
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <button
              type="button"
              onClick={onLogin}
              className="text-primary hover:underline font-medium"
            >
              Sign In
            </button>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
