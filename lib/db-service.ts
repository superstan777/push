import { db } from "./firebase";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { getLocalDateString } from "./utils";

export interface UserData {
  phoneNumber: string;
  currentDayNumber: number; // licznik dni cyklu 28 dni
  currentWorkoutNumber: number; // licznik wszystkich treningów progresji
  startDate: Timestamp;

  capacity?: number;
  lastTestResult?: number;

  pushupsDone: number;
  lastCompletedDate?: string; // primary trening
  lastExtraCompletedDate?: string; // drugi trening w tym samym dniu
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

  return { avgReserve, fatigueIndex, observedCapacity };
};

const updateCapacity = (
  oldCapacity: number,
  observedCapacity: number,
  alpha = 0.15,
) => oldCapacity * (1 - alpha) + observedCapacity * alpha;

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
  if (dayNumber === 1 || capacity === undefined) {
    return { type: "test", plannedSets: [0], isCompleted: false };
  }

  const weeklyModifier = 0.9 + (dayNumber % 7) * 0.02;
  const TARGET_RESERVE = 1.5;
  const RESERVE_GAIN = 0.4;

  let base = capacity * weeklyModifier;
  if (lastAvgReserve !== undefined)
    base += (lastAvgReserve - TARGET_RESERVE) * RESERVE_GAIN;

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
    const data = userSnap.data() as UserData;

    // migracja starych użytkowników
    if (data.currentWorkoutNumber === undefined) {
      await setDoc(
        userRef,
        { currentWorkoutNumber: data.currentDayNumber },
        { merge: true },
      );
      data.currentWorkoutNumber = data.currentDayNumber;
    }

    return data;
  }

  const newUser: UserData = {
    phoneNumber,
    currentDayNumber: 1,
    currentWorkoutNumber: 1,
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
  workoutNumber?: number,
): Promise<Workout | null> => {
  if (workoutNumber === undefined) return null;

  const docRef = doc(db, "users", uid, "workouts", workoutNumber.toString());
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data() as Workout) : null;
};

export const completeWorkout = async (
  uid: string,
  userData: UserData,
  doneSets: number[],
  isExtra = false,
) => {
  const userRef = doc(db, "users", uid);
  const workoutNumber = userData.currentWorkoutNumber;
  const workoutRef = doc(
    db,
    "users",
    uid,
    "workouts",
    workoutNumber.toString(),
  );
  const workoutSnap = await getDoc(workoutRef);
  const workoutData = workoutSnap.exists()
    ? (workoutSnap.data() as Workout)
    : null;

  const today = getLocalDateString();

  let newCapacity = userData.capacity;
  let newLastTestResult = userData.lastTestResult;

  if (!workoutData || workoutData.type === "test") {
    const testResult = doneSets[0];
    newCapacity = testResult * 0.6;
    newLastTestResult = testResult;
  } else {
    const analysis = analyzeWorkout(workoutData.plannedSets, doneSets);
    newCapacity =
      userData.capacity !== undefined
        ? updateCapacity(userData.capacity, analysis.observedCapacity)
        : analysis.observedCapacity;

    await setDoc(
      workoutRef,
      { avgReserve: analysis.avgReserve, fatigueIndex: analysis.fatigueIndex },
      { merge: true },
    );
  }

  // zapis wykonania treningu
  await setDoc(
    workoutRef,
    { doneSets, isCompleted: true, completedAt: Timestamp.now() },
    { merge: true },
  );

  const workoutPushups = doneSets.reduce((a, b) => a + b, 0);

  // aktualizacja usera
  const updateData: Partial<UserData> = {
    capacity: newCapacity,
    lastTestResult: newLastTestResult,
    pushupsDone: (userData.pushupsDone ?? 0) + workoutPushups,
    currentWorkoutNumber: userData.currentWorkoutNumber + 1, // zawsze rośnie
  };

  if (!isExtra) {
    // primary trening
    if (userData.lastCompletedDate !== today) {
      updateData.currentDayNumber = userData.currentDayNumber + 1;
      updateData.lastCompletedDate = today;
    }
  } else {
    // extra trening
    if (userData.lastExtraCompletedDate !== today) {
      updateData.lastExtraCompletedDate = today;
    }
  }

  await setDoc(userRef, updateData, { merge: true });

  // generowanie kolejnego treningu
  const nextWorkout = generateWorkout({
    dayNumber: updateData.currentDayNumber ?? userData.currentDayNumber,
    capacity: newCapacity,
    lastAvgReserve: workoutData?.avgReserve,
  });

  const nextWorkoutRef = doc(
    db,
    "users",
    uid,
    "workouts",
    (userData.currentWorkoutNumber + 1).toString(),
  );
  await setDoc(nextWorkoutRef, nextWorkout);
};
