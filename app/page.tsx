"use client";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  getOrCreateUser,
  getWorkout,
  type Workout,
  type UserData,
} from "@/lib/db-service";
import { AuthScreen } from "@/components/AuthScreen";
import { MainScreen } from "@/components/MainScreen";
import { WorkoutScreen } from "@/components/WorkoutScreen";
import { completeWorkout } from "@/lib/db-service";
import { Spinner } from "@/components/ui/spinner";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
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
    <main className="h-dvh max-w-70 mx-auto">
      {user && userData ? (
        isTraining && activeWorkout ? (
          <WorkoutScreen
            workout={activeWorkout}
            onComplete={async (results) => {
              setLoading(true);
              try {
                await completeWorkout(
                  user.uid,
                  userData.currentDayNumber,
                  results,
                );

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
