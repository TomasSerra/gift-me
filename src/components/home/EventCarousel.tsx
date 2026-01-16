import { useUpcomingBirthdays } from "@/hooks/useActivityFeed";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Cake, Calendar } from "lucide-react";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

export function EventCarousel() {
  const birthdays = useUpcomingBirthdays();
  const navigate = useNavigate();

  if (birthdays.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-4 mb-4">
        <Calendar size={16} className="text-white" />
        <h2 className="font-semibold">Upcoming Events</h2>
      </div>

      <div className="overflow-x-auto no-scrollbar">
        <div className="flex gap-3 px-4 pb-2">
          {birthdays.map((birthday) => (
            <Card
              key={birthday.user.id}
              className="shrink-0 w-40 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/friends/${birthday.user.id}`)}
            >
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="relative">
                  <Avatar
                    id={birthday.user.id}
                    firstName={birthday.user.firstName}
                    lastName={birthday.user.lastName}
                    photoURL={birthday.user.photoURL}
                    size="lg"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1">
                    <Cake className="w-3 h-3 text-white" />
                  </div>
                </div>

                <p className="font-medium mt-3 truncate w-full">
                  {birthday.user.firstName
                    ? `${birthday.user.firstName} ${
                        birthday.user.lastName || ""
                      }`.trim()
                    : birthday.user.username}
                </p>

                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(birthday.date, "MMM d", { locale: enUS })}
                </p>

                <p className="text-xs font-medium text-primary mt-1">
                  {birthday.daysUntil === 0
                    ? "Today!"
                    : birthday.daysUntil === 1
                    ? "Tomorrow!"
                    : `In ${birthday.daysUntil} days`}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
