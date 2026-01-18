import { useState } from "react";
import { RepsDrawer } from "./RepsDrawer";
import { RestTimer } from "./RestTimer";
import type { Workout } from "@/lib/db-service";

interface WorkoutScreenProps {
  workout: Workout;
  onComplete: (results: number[]) => void;
}

type Step = "set" | "rest";

const BASE_REST = 60;
const HARD_REST = 90;
const MAX_REST = 120;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const calculateRestTime = (plannedReps: number, doneReps: number): number => {
  if (doneReps >= 30) {
    return HARD_REST;
  }

  if (doneReps < plannedReps) {
    const deficit = plannedReps - doneReps;
    const extra = Math.ceil(deficit / 2) * 10;
    return clamp(BASE_REST + extra, BASE_REST, MAX_REST);
  }

  if (doneReps === plannedReps) {
    return BASE_REST;
  }

  const surplus = doneReps - plannedReps;
  const extra = Math.min(surplus * 5, 20);

  return clamp(BASE_REST + extra, BASE_REST, HARD_REST);
};

export function WorkoutScreen({ workout, onComplete }: WorkoutScreenProps) {
  const [step, setStep] = useState<Step>("set");
  const [currentSet, setCurrentSet] = useState(0);
  const [completedReps, setCompletedReps] = useState<number[]>([]);
  const [restDuration, setRestDuration] = useState<number>(BASE_REST);

  const isTest = workout.type === "test";
  const sets = workout.plannedSets;

  const handleNext = (repsDone: number) => {
    const newResults = [...completedReps, repsDone];
    setCompletedReps(newResults);

    if (isTest || currentSet + 1 >= sets.length) {
      onComplete(newResults);
      return;
    }

    const planned = sets[currentSet];
    const rest = calculateRestTime(planned, repsDone);

    setRestDuration(rest);
    setStep("rest");
  };

  const handleRestComplete = () => {
    setCurrentSet((prev) => prev + 1);
    setStep("set");
  };

  return (
    <div className="flex items-center justify-center h-full p-6 text-center w-full">
      <div className="flex flex-col items-center gap-8 text-center w-full">
        {step === "set" && (
          <>
            <div className="text-muted-foreground tracking-widest text-sm">
              {isTest ? "as many reps as possible" : "target reps"}
            </div>

            <div className="text-8xl font-bold tracking-tighter">
              {isTest ? "?" : sets[currentSet]}
            </div>

            <RepsDrawer
              initialValue={isTest ? 0 : sets[currentSet]}
              onConfirm={handleNext}
            />
          </>
        )}

        {step === "rest" && (
          <RestTimer duration={restDuration} onComplete={handleRestComplete} />
        )}
      </div>
    </div>
  );
}
