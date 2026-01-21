import { db } from "./firebase";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { getLocalDateString } from "./utils";

export interface UserData {
  phoneNumber: string;
  currentDayNumber: number;
  startDate: Timestamp;

  capacity?: number;
  lastTestResult?: number;

  pushupsDone: number;
  lastCompletedDate?: string;
}

export interface Workout {
  type: "test" | "workout";
  plannedSets: number[];
  doneSets?: number[];

  isCompleted: boolean;
  completedAt?: Timestamp;

  avgReserve?: number;
  fatigueIndex?: number;
}

/* ---------------- ANALIZA TRENINGU ---------------- */

const analyzeWorkout = (planned: number[], done: number[]) => {
  const reserves = planned.map((p, i) => done[i] - p);

  const avgReserve = reserves.reduce((a, b) => a + b, 0) / reserves.length;

  const fatigueIndex = reserves[reserves.length - 1] - reserves[0];

  const observedCapacity = done.reduce((a, b) => a + b, 0) / done.length;

  return {
    avgReserve,
    fatigueIndex,
    observedCapacity,
  };
};

const updateCapacity = (
  oldCapacity: number,
  observedCapacity: number,
  alpha = 0.15,
) => {
  return oldCapacity * (1 - alpha) + observedCapacity * alpha;
};

/* ---------------- GENERATOR TRENINGU ---------------- */

export const generateWorkout = ({
  dayNumber,
  capacity,
  lastAvgReserve,
}: {
  dayNumber: number;
  capacity?: number;
  lastAvgReserve?: number;
}): Workout => {
  // 👉 TEST zostaje (UI obsługuje)
  if (dayNumber === 1 || capacity === undefined) {
    return {
      type: "test",
      plannedSets: [0],
      isCompleted: false,
    };
  }

  const weeklyModifier = 0.9 + (dayNumber % 7) * 0.02;

  const TARGET_RESERVE = 1.5;
  const RESERVE_GAIN = 0.4;

  let base = capacity * weeklyModifier;

  if (lastAvgReserve !== undefined) {
    base += (lastAvgReserve - TARGET_RESERVE) * RESERVE_GAIN;
  }

  base = Math.max(2, Math.round(base));

  return {
    type: "workout",
    plannedSets: [base, base, base + 2, base, base + 4],
    isCompleted: false,
  };
};

/* ---------------- USER ---------------- */

export const getOrCreateUser = async (
  uid: string,
  phoneNumber: string,
): Promise<UserData> => {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return userSnap.data() as UserData;
  }

  const newUser: UserData = {
    phoneNumber,
    currentDayNumber: 1,
    startDate: Timestamp.now(),
    pushupsDone: 0,
    lastTestResult: undefined,
  };

  await setDoc(userRef, newUser);

  const firstWorkout = generateWorkout({ dayNumber: 1 });

  const firstWorkoutRef = doc(db, "users", uid, "workouts", "1");
  await setDoc(firstWorkoutRef, firstWorkout);

  return newUser;
};

/* ---------------- WORKOUT ---------------- */

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

export const completeWorkout = async (
  uid: string,
  currentDay: number,
  doneSets: number[],
) => {
  const userRef = doc(db, "users", uid);
  const workoutRef = doc(db, "users", uid, "workouts", currentDay.toString());

  const userSnap = await getDoc(userRef);
  const workoutSnap = await getDoc(workoutRef);

  const userData = userSnap.data() as UserData;
  const workoutData = workoutSnap.data() as Workout;

  const today = getLocalDateString();

  let newCapacity = userData.capacity;
  let newLastTestResult = userData.lastTestResult;

  if (workoutData.type === "test") {
    const testResult = doneSets[0];

    newCapacity = testResult * 0.6; // bezpieczny start
    newLastTestResult = testResult;
  } else {
    const analysis = analyzeWorkout(workoutData.plannedSets, doneSets);

    newCapacity =
      userData.capacity !== undefined
        ? updateCapacity(userData.capacity, analysis.observedCapacity)
        : analysis.observedCapacity;

    await setDoc(
      workoutRef,
      {
        avgReserve: analysis.avgReserve,
        fatigueIndex: analysis.fatigueIndex,
      },
      { merge: true },
    );
  }

  await setDoc(
    workoutRef,
    {
      doneSets,
      isCompleted: true,
      completedAt: Timestamp.now(),
    },
    { merge: true },
  );

  const workoutPushups = doneSets.reduce((a, b) => a + b, 0);

  await setDoc(
    userRef,
    {
      currentDayNumber: currentDay + 1,
      capacity: newCapacity,
      lastTestResult: newLastTestResult,
      pushupsDone: (userData.pushupsDone ?? 0) + workoutPushups,
      lastCompletedDate: today,
    },
    { merge: true },
  );

  const nextWorkout = generateWorkout({
    dayNumber: currentDay + 1,
    capacity: newCapacity,
    lastAvgReserve: workoutData.avgReserve,
  });

  const nextWorkoutRef = doc(
    db,
    "users",
    uid,
    "workouts",
    (currentDay + 1).toString(),
  );

  await setDoc(nextWorkoutRef, nextWorkout);
};
