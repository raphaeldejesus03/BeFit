// src/gamification/engine.js
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

/**
 * LEVELS define the XP thresholds for each level.
 */
export const LEVELS = [
  { name: 'Bronze', minXP: 0 },
  { name: 'Silver', minXP: 500 },
  { name: 'Gold', minXP: 1500 },
  { name: 'Platinum', minXP: 4000 },
];

/**
 * XP rules for different actions in the app.
 * You can tune these numbers later from one place.
 */
export const XP_RULES = {
  workout: () => 50,
  water: () => 5,
  meal: () => 15,
};

const COLLECTION = 'gamification';

function userRef(uid) {
  return doc(db, COLLECTION, uid);
}

function getLevelNameFromXP(xp) {
  let current = LEVELS[0]?.name || 'Bronze';
  LEVELS.forEach((lvl) => {
    if (xp >= lvl.minXP) {
      current = lvl.name;
    }
  });
  return current;
}

/**
 * Ensures a gamification document exists for this user.
 */
export async function ensureGamification(uid) {
  const ref = userRef(uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const initial = {
      xp: 0,
      levelName: 'Bronze',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      totalWorkouts: 0,
      totalWater: 0,
      totalMeals: 0,
      streaks: {
        workout: 0,
        water: 0,
        nutrition: 0,
      },
      lastActivity: null,
      badges: {},
      aiChats: 0,
    };
    await setDoc(ref, initial);
    return initial;
  }
  return snap.data();
}

/**
 * Internal: recompute levelName based on XP.
 */
async function recalcLevel(uid) {
  const snap = await getDoc(userRef(uid));
  if (!snap.exists()) return;
  const data = snap.data();
  const xp = data.xp || 0;
  const newLevel = getLevelNameFromXP(xp);
  if (newLevel !== data.levelName) {
    await updateDoc(userRef(uid), {
      levelName: newLevel,
      updatedAt: serverTimestamp(),
    });
  }
}

/**
 * Award XP to the user and update their level if needed.
 */
export async function awardXP(uid, amount) {
  if (!amount || amount === 0) return;
  await ensureGamification(uid);
  await updateDoc(userRef(uid), {
    xp: increment(amount),
    updatedAt: serverTimestamp(),
  });
  await recalcLevel(uid);
}

/**
 * Simple streak update by type (workout, water, nutrition).
 * Right now this just increments the streak count; you can later
 * reset if days are missed if you track lastActivity per type.
 */
async function updateStreak(uid, type) {
  await ensureGamification(uid);
  const snap = await getDoc(userRef(uid));
  if (!snap.exists()) return;
  const data = snap.data();
  const streaks = data.streaks || {};
  const current = streaks[type] || 0;

  const newStreaks = {
    ...streaks,
    [type]: current + 1,
  };

  await updateDoc(userRef(uid), {
    streaks: newStreaks,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Evaluate and award badges based on the current gamification data.
 * This function is intentionally straightforward: it reads the doc,
 * checks conditions, and sets new badge keys to true.
 */
export async function maybeAwardBadges(uid, contextType) {
  await ensureGamification(uid);
  const ref = userRef(uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const d = snap.data();
  const owned = d.badges || {};
  const toAdd = {};

  const xp = d.xp || 0;
  const totalWorkouts = d.totalWorkouts || 0;
  const totalWater = d.totalWater || 0;
  const totalMeals = d.totalMeals || 0;
  const aiChats = d.aiChats || 0;

  const streakWorkout = d.streaks?.workout || 0;
  const streakWater = d.streaks?.water || 0;

  // ---- STREAK BADGES ----
  if (streakWorkout >= 1 && !owned.STREAK_1) toAdd.STREAK_1 = true;
  if (streakWorkout >= 3 && !owned.STREAK_3) toAdd.STREAK_3 = true;
  if (streakWorkout >= 7 && !owned.STREAK_7) toAdd.STREAK_7 = true;
  if (streakWorkout >= 14 && !owned.STREAK_14) toAdd.STREAK_14 = true;
  if (streakWorkout >= 30 && !owned.STREAK_30) toAdd.STREAK_30 = true;

  if (streakWater >= 7 && !owned.HYDRATION_STREAK_7) {
    toAdd.HYDRATION_STREAK_7 = true;
  }

  // ---- WORKOUT VOLUME ----
  if (totalWorkouts >= 1 && !owned.FIRST_WORKOUT) toAdd.FIRST_WORKOUT = true;
  if (totalWorkouts >= 5 && !owned.FIVE_WORKOUTS) toAdd.FIVE_WORKOUTS = true;
  if (totalWorkouts >= 10 && !owned.TEN_WORKOUTS) toAdd.TEN_WORKOUTS = true;
  if (totalWorkouts >= 20 && !owned.TWENTY_WORKOUTS) toAdd.TWENTY_WORKOUTS = true;
  if (totalWorkouts >= 50 && !owned.FIFTY_WORKOUTS) toAdd.FIFTY_WORKOUTS = true;
  if (totalWorkouts >= 100 && !owned.HUNDRED_WORKOUTS) toAdd.HUNDRED_WORKOUTS = true;

  // ---- HYDRATION ----
  if (totalWater >= 1 && !owned.FIRST_WATER) toAdd.FIRST_WATER = true;
  if (totalWater >= 50 && !owned.FIVE_WATER_GOALS) toAdd.FIVE_WATER_GOALS = true;
  if (totalWater >= 200 && !owned.THIRTY_WATER_GOALS) toAdd.THIRTY_WATER_GOALS = true;

  // ---- NUTRITION ----
  if (totalMeals >= 1 && !owned.FIRST_MEAL) toAdd.FIRST_MEAL = true;
  if (totalMeals >= 10 && !owned.FIVE_MEAL_DAYS) toAdd.FIVE_MEAL_DAYS = true;
  if (totalMeals >= 30 && !owned.TWENTY_MEAL_DAYS) toAdd.TWENTY_MEAL_DAYS = true;

  // ---- LEVEL BADGES ----
  const levelName = getLevelNameFromXP(xp);
  if (levelName === 'Bronze' && !owned.LEVEL_BRONZE) toAdd.LEVEL_BRONZE = true;
  if (levelName === 'Silver' && !owned.LEVEL_SILVER) toAdd.LEVEL_SILVER = true;
  if (levelName === 'Gold' && !owned.LEVEL_GOLD) toAdd.LEVEL_GOLD = true;
  if (levelName === 'Platinum' && !owned.LEVEL_PLATINUM) toAdd.LEVEL_PLATINUM = true;

  // ---- AI COACH ----
  if (aiChats >= 1 && !owned.AI_FIRST_CHAT) toAdd.AI_FIRST_CHAT = true;
  if (aiChats >= 10 && !owned.AI_TEN_CHATS) toAdd.AI_TEN_CHATS = true;

  // QUICK_START: used app quickly after creation
  if (!owned.QUICK_START && d.createdAt) {
    try {
      const created =
        typeof d.createdAt.toDate === 'function'
          ? d.createdAt.toDate()
          : new Date(d.createdAt);
      const diffMinutes = (Date.now() - created.getTime()) / 60000;
      if (diffMinutes <= 60) {
        toAdd.QUICK_START = true;
      }
    } catch (e) {
      // ignore
    }
  }

  // META: Badge Collector
  const newCount = Object.keys(owned).length + Object.keys(toAdd).length;
  if (newCount >= 5 && !owned.TEST_MASTER) {
    toAdd.TEST_MASTER = true;
  }

  // If nothing to add, just return
  if (Object.keys(toAdd).length === 0) return;

  await updateDoc(ref, {
    badges: {
      ...owned,
      ...toAdd,
    },
    updatedAt: serverTimestamp(),
  });
}

/**
 * Record a workout event: increments workout count, streak,
 * awards XP, and reevaluates badges.
 */
export async function recordWorkoutGamification(uid) {
  await ensureGamification(uid);
  await updateDoc(userRef(uid), {
    totalWorkouts: increment(1),
    updatedAt: serverTimestamp(),
  });
  await updateStreak(uid, 'workout');
  await awardXP(uid, XP_RULES.workout());
  await maybeAwardBadges(uid, 'workout');
}

/**
 * Record a water event: increments water count, streak,
 * awards XP, and reevaluates badges.
 */
export async function recordWaterGamification(uid) {
  await ensureGamification(uid);
  await updateDoc(userRef(uid), {
    totalWater: increment(1),
    updatedAt: serverTimestamp(),
  });
  await updateStreak(uid, 'water');
  await awardXP(uid, XP_RULES.water());
  await maybeAwardBadges(uid, 'water');
}

/**
 * Record a meal/nutrition event: increments meal count,
 * awards XP, and reevaluates badges.
 */
export async function recordMealGamification(uid) {
  await ensureGamification(uid);
  await updateDoc(userRef(uid), {
    totalMeals: increment(1),
    updatedAt: serverTimestamp(),
  });
  await updateStreak(uid, 'nutrition');
  await awardXP(uid, XP_RULES.meal());
  await maybeAwardBadges(uid, 'meal');
}

/**
 * Record an AI coaching interaction (for AI achievements).
 */
export async function recordAICoachGamification(uid) {
  await ensureGamification(uid);
  await updateDoc(userRef(uid), {
    aiChats: increment(1),
    updatedAt: serverTimestamp(),
  });
  await maybeAwardBadges(uid, 'ai');
}

/**
 * Read the gamification document for a user.
 * This is what the AchievementsScreen uses.
 */
export async function readGamification(uid) {
  const snap = await getDoc(userRef(uid));
  if (!snap.exists()) {
    return {
      xp: 0,
      levelName: 'Bronze',
      streaks: { workout: 0, water: 0, nutrition: 0 },
      badges: {},
    };
  }
  const d = snap.data();
  const xp = d.xp || 0;
  return {
    ...d,
    xp,
    levelName: d.levelName || getLevelNameFromXP(xp),
  };
}
