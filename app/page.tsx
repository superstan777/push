"use client";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getOrCreateUser, getWorkout } from "@/lib/db-service";
import type { UserData, Workout } from "@/lib/db-service";
import { AuthScreen } from "@/components/AuthScreen";
import { MainScreen } from "@/components/MainScreen";

import { WorkoutScreen } from "@/components/WorkoutScreen";
import { completeWorkout } from "@/lib/db-service";
import { Spinner } from "@/components/ui/spinner";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<UserData | null>(null);

  // Stan przechowujący dane pobranego treningu
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  // Stan sterujący widokiem (czy jesteśmy w trakcie treningu)
  const [isTraining, setIsTraining] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const data = await getOrCreateUser(
          currentUser.uid,
          currentUser.phoneNumber || "",
        );
        setUserData(data);
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Funkcja odpalana po kliknięciu "Push" w MainScreen
  const handleStartTraining = async () => {
    if (!user || !userData) return;

    setLoading(true);
    const workout = await getWorkout(user.uid, userData.currentDayNumber);

    if (workout) {
      setActiveWorkout(workout);
      setIsTraining(true);
    } else {
      alert("Nie znaleziono planu na dziś w bazie danych (workouts/1)!");
    }
    setLoading(false);
  };

  if (loading)
    return (
      <div className="flex h-dvh items-center justify-center">
        <Spinner />
      </div>
    );

  return (
    <main className="h-dvh bg-background">
      {user && userData ? (
        isTraining && activeWorkout ? (
          // src/App.tsx

          <WorkoutScreen
            workout={activeWorkout}
            onComplete={async (results) => {
              setLoading(true);
              try {
                // results to tablica [20, 15, 10] przekazana z WorkoutScreen
                await completeWorkout(
                  user.uid,
                  userData.currentDayNumber,
                  results,
                );

                // Ponowne pobranie danych użytkownika, aby kropki w MainScreen się odświeżyły
                const updatedData = await getOrCreateUser(
                  user.uid,
                  user.phoneNumber,
                );
                setUserData(updatedData);

                setIsTraining(false);
                setActiveWorkout(null);
              } catch (e) {
                console.error("Błąd zapisu:", e);
              } finally {
                setLoading(false);
              }
            }}
          />
        ) : (
          <MainScreen userData={userData} onStart={handleStartTraining} />
        )
      ) : (
        <AuthScreen />
      )}
    </main>
  );
}
