import { db } from "./firebase";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";

export interface UserData {
  phoneNumber: string;
  currentDayNumber: number;
  lastTestResult: number;
  startDate: Timestamp;
  lastCompletedDate?: string;
  pushupsDone: number;
}

export interface Workout {
  type: "test" | "workout";
  plannedSets: number[];
  doneSets?: number[];
  isCompleted: boolean;
  completedAt?: Timestamp;
}

export const getOrCreateUser = async (
  uid: string,
  phoneNumber: string,
): Promise<UserData> => {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return userSnap.data() as UserData;
  }

  const startDay = 1;
  const initialTestResult = 0;

  const newUser: UserData = {
    phoneNumber,
    currentDayNumber: startDay,
    lastTestResult: initialTestResult,
    startDate: Timestamp.now(),
    pushupsDone: 0,
  };

  await setDoc(userRef, newUser);

  const firstWorkout: Workout = generateWorkoutPlan(
    startDay,
    initialTestResult,
  );

  const firstWorkoutRef = doc(
    db,
    "users",
    uid,
    "workouts",
    startDay.toString(),
  );

  await setDoc(firstWorkoutRef, firstWorkout);

  return newUser;
};

export const getWorkout = async (
  uid: string,
  dayNumber: number,
): Promise<Workout | null> => {
  const docRef = doc(db, "users", uid, "workouts", dayNumber.toString());
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data() as Workout;
  }
  return null;
};

export const generateWorkoutPlan = (
  dayNumber: number,
  lastTestResult: number,
): Workout => {
  if ((dayNumber - 1) % 28 === 0) {
    return { type: "test", plannedSets: [0], isCompleted: false };
  }

  const base = Math.max(2, Math.floor(lastTestResult * 0.5));
  const dayInWeekModifier = dayNumber % 7;

  const plannedSets = [
    base,
    base + 2,
    base,
    base,
    base + 4 + dayInWeekModifier,
  ];

  return {
    type: "workout",
    plannedSets,
    isCompleted: false,
  };
};

export const completeWorkout = async (
  uid: string,
  currentDay: number,
  doneSets: number[],
) => {
  const userRef = doc(db, "users", uid);
  const currentWorkoutRef = doc(
    db,
    "users",
    uid,
    "workouts",
    currentDay.toString(),
  );

  const userSnap = await getDoc(userRef);
  const userData = userSnap.data() as UserData;

  const isTestDay = (currentDay - 1) % 28 === 0;
  const testResult = isTestDay ? doneSets[0] : userData.lastTestResult;

  const workoutPushups = doneSets.reduce((sum, v) => sum + v, 0);
  const totalPushups = (userData.pushupsDone ?? 0) + workoutPushups;

  const today = new Date().toISOString().split("T")[0];

  await setDoc(
    currentWorkoutRef,
    {
      isCompleted: true,
      doneSets,
      completedAt: Timestamp.now(),
    },
    { merge: true },
  );

  const nextDay = currentDay + 1;

  await setDoc(
    userRef,
    {
      currentDayNumber: nextDay,
      lastTestResult: testResult,
      lastCompletedDate: today,
      pushupsDone: totalPushups,
    },
    { merge: true },
  );

  const nextWorkoutRef = doc(db, "users", uid, "workouts", nextDay.toString());
  const nextWorkout = generateWorkoutPlan(nextDay, testResult);
  await setDoc(nextWorkoutRef, nextWorkout);
};
