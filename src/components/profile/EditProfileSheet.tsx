import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useUpdateUser } from "@/hooks/useUser";
import type { User } from "@/types";
import { format } from "date-fns";

const editProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  birthday: z.string().optional(),
});

type EditProfileFormData = z.infer<typeof editProfileSchema>;

interface EditProfileSheetProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProfileSheet({
  user,
  open,
  onOpenChange,
}: EditProfileSheetProps) {
  const updateUser = useUpdateUser();

  const birthdayDate = user.birthday?.toDate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditProfileFormData>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      birthday: birthdayDate ? format(birthdayDate, "yyyy-MM-dd") : "",
    },
  });

  const onSubmit = async (data: EditProfileFormData) => {
    // Parse date as local timezone (not UTC)
    let birthday: Date | null = null;
    if (data.birthday) {
      const [year, month, day] = data.birthday.split("-").map(Number);
      birthday = new Date(year, month - 1, day);
    }

    await updateUser.mutateAsync({
      firstName: data.firstName,
      lastName: data.lastName,
      birthday,
    });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit Profile</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6">
          <Input
            label="Email"
            type="email"
            value={user.email}
            disabled
            className="opacity-50"
            hint="Email cannot be changed"
          />

          <Input
            label="Username"
            value={user.username}
            disabled
            className="opacity-50"
            hint="Username cannot be changed"
          />

          <Input
            label="First Name"
            placeholder="Your first name"
            error={errors.firstName?.message}
            {...register("firstName")}
          />

          <Input
            label="Last Name"
            placeholder="Your last name"
            error={errors.lastName?.message}
            {...register("lastName")}
          />

          <Input
            label="Birthday"
            type="date"
            {...register("birthday")}
          />

          <div className="pt-4">
            <Button
              type="submit"
              className="w-full"
              disabled={updateUser.isPending}
            >
              {updateUser.isPending ? (
                <Spinner size="sm" className="text-white" />
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
