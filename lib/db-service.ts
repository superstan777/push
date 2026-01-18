import { db } from "./firebase";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";

export interface UserData {
  phoneNumber: string;
  currentDayNumber: number;
  lastTestResult: number;
  startDate: Timestamp;
  lastCompletedDate?: string;
}

// Pobiera dane usera lub tworzy go, jeśli loguje się pierwszy raz
export const getOrCreateUser = async (
  uid: string,
  phoneNumber: string
): Promise<UserData> => {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return userSnap.data() as UserData;
  } else {
    // Nowy użytkownik - Dzień 1
    const newUser: UserData = {
      phoneNumber,
      currentDayNumber: 1,
      lastTestResult: 0,
      startDate: Timestamp.now(),
    };
    await setDoc(userRef, newUser);
    return newUser;
  }
};

export interface Workout {
  type: "test" | "workout";
  plannedSets: number[];
  doneSets?: number[]; // To pole dodamy po zakończeniu
  isCompleted: boolean;
  completedAt?: Timestamp;
}

export const getWorkout = async (
  uid: string,
  dayNumber: number
): Promise<Workout | null> => {
  const docRef = doc(db, "users", uid, "workouts", dayNumber.toString());
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data() as Workout;
  }
  return null;
};

// src/lib/db-service.ts

export const generateWorkoutPlan = (
  dayNumber: number,
  lastTestResult: number
): Workout => {
  // 1. DZIEŃ TESTU (nie zmieniamy)
  if ((dayNumber - 1) % 28 === 0) {
    return { type: "test", plannedSets: [0], isCompleted: false };
  }

  // 2. LOGIKA AGRESYWNEGO TRENINGU

  // Bazujemy na 50% wyniku testu jako fundamencie dla najmocniejszej serii
  // Dla testu 20: base to 10.
  const base = Math.max(2, Math.floor(lastTestResult * 0.5));

  // Modyfikator dnia (żeby poniedziałek był inny niż środa)
  // Day 2 (wtorek) -> mod 0, Day 3 -> mod 1 itd.
  const dayInWeekModifier = dayNumber % 7;

  // Budujemy objętość: 5 serii
  // Przykład dla testu 20: [10, 12, 10, 10, 14] = 56 pompek (ponad 2.5x wynik testu)
  const plannedSets = [
    base, // Seria 1: 50% maxa
    base + 2, // Seria 2: Przeciążenie
    base, // Seria 3: Utrzymanie
    base, // Seria 4: Utrzymanie
    base + 4 + dayInWeekModifier, // Seria 5: Finiszer (rośnie z każdym dniem tygodnia)
  ];

  return {
    type: "workout",
    plannedSets: plannedSets,
    isCompleted: false,
  };
};

export const completeWorkout = async (
  uid: string,
  currentDay: number,
  doneSets: number[]
) => {
  const userRef = doc(db, "users", uid);
  const currentWorkoutRef = doc(
    db,
    "users",
    uid,
    "workouts",
    currentDay.toString()
  );

  // 1. Pobieramy aktualne dane użytkownika
  const userSnap = await getDoc(userRef);
  const userData = userSnap.data() as UserData;

  // 2. Wyliczamy wynik testu (jeśli to był dzień testu)
  const isTestDay = (currentDay - 1) % 28 === 0;
  const testResult = isTestDay ? doneSets[0] : userData.lastTestResult;

  // 3. Pobieramy dzisiejszą datę w formacie YYYY-MM-DD
  const today = new Date().toISOString().split("T")[0];

  // 4. Oznaczamy bieżący trening jako zakończony
  await setDoc(
    currentWorkoutRef,
    {
      isCompleted: true,
      doneSets: doneSets,
      completedAt: Timestamp.now(),
    },
    { merge: true }
  );

  // 5. Aktualizujemy profil użytkownika (następny dzień, wynik testu i data zakończenia)
  const nextDay = currentDay + 1;
  await setDoc(
    userRef,
    {
      currentDayNumber: nextDay,
      lastTestResult: testResult,
      lastCompletedDate: today, // To pole blokuje kolejny trening dzisiaj
    },
    { merge: true }
  );

  // 6. Generujemy i zapisujemy plan na kolejny dzień treningowy
  const nextWorkoutRef = doc(db, "users", uid, "workouts", nextDay.toString());
  const nextWorkout = generateWorkoutPlan(nextDay, testResult);
  await setDoc(nextWorkoutRef, nextWorkout);
};
