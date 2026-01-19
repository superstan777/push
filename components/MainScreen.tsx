import type { UserData } from "@/lib/db-service";
import { PushButton } from "./PushButton";

interface MainScreenProps {
  onStart: () => void;
  userData: UserData;
}

const getLocalDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const MainScreen: React.FC<MainScreenProps> = ({
  userData,
  onStart,
}) => {
  const today = getLocalDateString();
  const isAlreadyDoneToday = userData.lastCompletedDate === today;

  const { currentDayNumber, pushupsDone } = userData;

  const activeDisplayDay = isAlreadyDoneToday
    ? currentDayNumber - 1
    : currentDayNumber;

  const totalCycles = Math.ceil(currentDayNumber / 28);
  const totalDots = totalCycles * 28;

  const completedUntil = currentDayNumber - 1;
  const activeDay = isAlreadyDoneToday ? null : currentDayNumber;

  const dots = Array.from({ length: totalDots }, (_, i) => {
    const dayIdx = i + 1;

    return {
      dayIdx,
      isCompleted: dayIdx <= completedUntil,
      isCurrent: dayIdx === activeDay,
    };
  });

  const dotBaseClass = "w-3 h-3 rounded-full transition-all";

  return (
    <div className="flex flex-col items-center justify-center h-full p-6">
      <div className="w-full max-w-70 space-y-12">
        <div className="flex items-baseline justify-between tracking-tighter">
          <h1>day {activeDisplayDay}</h1>
          <h1>{pushupsDone}</h1>
        </div>

        <div className="grid grid-cols-7 gap-4 justify-items-center">
          {dots.map((dot) => (
            <div
              key={dot.dayIdx}
              className={`${dotBaseClass} ${
                dot.isCompleted
                  ? "bg-primary"
                  : dot.isCurrent
                    ? "bg-primary animate-pulse scale-125 shadow-[0_0_8px_rgba(var(--primary),0.5)]"
                    : "bg-muted-foreground/20"
              }`}
            />
          ))}
        </div>

        <PushButton onClick={onStart} isDoneToday={isAlreadyDoneToday} />
      </div>
    </div>
  );
};
