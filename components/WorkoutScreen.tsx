import { useState } from "react";
import { RepsDrawer } from "./RepsDrawer";
import { RestTimer } from "./RestTimer";
import type { Workout } from "@/lib/db-service";

interface WorkoutScreenProps {
  workout: Workout;
  onComplete: (results: number[]) => void; // Przekazujemy wyniki do App.tsx
}

type Step = "set" | "rest";

export function WorkoutScreen({ workout, onComplete }: WorkoutScreenProps) {
  const [step, setStep] = useState<Step>("set");
  const [currentSet, setCurrentSet] = useState(0);

  // Tablica do zapisywania faktycznie wykonanych pompek w każdej serii
  const [completedReps, setCompletedReps] = useState<number[]>([]);

  const isTest = workout.type === "test";
  const sets = workout.plannedSets;

  const handleNext = (repsDone: number) => {
    const newResults = [...completedReps, repsDone];
    setCompletedReps(newResults);

    // Jeśli to był test LUB ostatnia seria treningu
    if (isTest || currentSet + 1 >= sets.length) {
      onComplete(newResults);
    } else {
      setStep("rest");
    }
  };

  const handleRestComplete = () => {
    setCurrentSet((prev) => prev + 1);
    setStep("set");
  };

  return (
    <div className="flex items-center justify-center h-full p-6 text-center">
      <div className="flex flex-col items-center gap-8 text-center w-full max-w-sm">
        {step === "set" && (
          <>
            <div className="text-muted-foreground  tracking-widest text-sm">
              {isTest ? "as many as possible" : "target reps"}
            </div>
            {/* Dla testu pokazujemy "0", co sugeruje start od zera/maxa */}
            <div className="text-8xl font-bold tracking-tighter">
              {isTest ? "?" : sets[currentSet]}
            </div>

            <RepsDrawer
              // Jeśli to test, sugerujemy 0, jeśli trening - sugerujemy planowaną liczbę
              initialValue={isTest ? 0 : sets[currentSet]}
              onConfirm={(value) => handleNext(value)}
            />
          </>
        )}

        {step === "rest" && (
          <RestTimer
            duration={2} // Możesz to później wyciągnąć do bazy (np. 60-90 sek)
            onComplete={handleRestComplete}
          />
        )}
      </div>
    </div>
  );
}
