import { useEffect, useState } from "react";
import type { UserData } from "@/lib/db-service";
import { PushButton } from "./PushButton";
import { getLocalDateString } from "@/lib/utils";

interface MainScreenProps {
  onStart: (isExtra?: boolean) => void;
  userData: UserData;
}

export const MainScreen: React.FC<MainScreenProps> = ({
  userData,
  onStart,
}) => {
  const today = getLocalDateString();

  const isPrimaryDoneToday = userData.lastCompletedDate === today;
  const isExtraDoneToday = userData.lastExtraCompletedDate === today;

  const { currentDayNumber, pushupsDone } = userData;

  const [isExtraUnlocked, setIsExtraUnlocked] = useState(false);

  const activeDisplayDay = isPrimaryDoneToday
    ? currentDayNumber - 1
    : currentDayNumber;

  const totalCycles = Math.ceil(currentDayNumber / 28);
  const totalDots = totalCycles * 28;

  const completedUntil = currentDayNumber - 1;

  useEffect(() => {
    if (!isPrimaryDoneToday || isExtraDoneToday) {
      setIsExtraUnlocked(false);
    }
  }, [isPrimaryDoneToday, isExtraDoneToday]);

  const dots = Array.from({ length: totalDots }, (_, i) => {
    const dayIdx = i + 1;

    return {
      dayIdx,
      isCompleted: dayIdx <= completedUntil,
      isPrimaryActive: dayIdx === activeDisplayDay && !isPrimaryDoneToday,
      isExtraAvailable:
        dayIdx === activeDisplayDay && isPrimaryDoneToday && !isExtraDoneToday,
    };
  });

  const dotBaseClass = "w-3 h-3 rounded-full transition-all relative z-10";

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
              className="relative flex items-center justify-center"
            >
              {dot.isExtraAvailable && isExtraUnlocked && (
                <div
                  className="
                    absolute
                    inset-0
                    rounded-full
                    border
                    border-red-500
                    radar-wave
                    z-0
                  "
                />
              )}

              <div
                className={`${dotBaseClass} ${
                  dot.isCompleted
                    ? "bg-primary"
                    : dot.isPrimaryActive
                      ? "bg-primary scale-125 shadow-[0_0_8px_rgba(var(--primary),0.5)]"
                      : "bg-muted-foreground/20"
                }`}
              />
            </div>
          ))}
        </div>

        <PushButton
          onSecretUnlocked={() => setIsExtraUnlocked(true)}
          onClick={(isSecret) => {
            if (isPrimaryDoneToday && !isExtraDoneToday && isSecret) {
              onStart(true);
            } else {
              onStart(false);
            }
          }}
          isDoneToday={isPrimaryDoneToday}
          isExtraDoneToday={isExtraDoneToday}
        />
      </div>
    </div>
  );
};
