// src/screens/GoalsScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from './ThemeContext';
import { lightTheme, darkTheme } from './themes';
import { recordWaterGamification } from '../gamification/engine';

/** ✅ New Goals theme (clean + calm "planning" vibe) */
const GOALS_GRADIENT = ['#4F46E5', '#06B6D4']; // indigo -> cyan
const GOALS_ACCENT = '#4F46E5';

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const safeNum = (n) => (Number.isFinite(n) ? n : 0);

const GoalsScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const colors = theme === 'light' ? lightTheme : darkTheme;

  const [goals, setGoals] = useState({
    weeklyWorkouts: 3,
    weeklyDuration: 150,
    dailyWater: 8,
    monthlyWorkouts: 12,
  });

  const [progress, setProgress] = useState({
    weeklyWorkouts: 0,
    weeklyDuration: 0,
    dailyWater: 0,
    monthlyWorkouts: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      fetchGoalsAndProgress();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const fetchGoalsAndProgress = async () => {
    try {
      setLoading(true);

      // Fetch user goals
      try {
        const uid = auth?.currentUser?.uid;
        if (!uid) return;

        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists() && userDoc.data().goals) {
          setGoals((prevDefaults) => ({ ...prevDefaults, ...userDoc.data().goals }));
        }
      } catch (goalError) {
        console.log('Could not fetch goals, using defaults:', goalError.message);
      }

      await calculateProgress();
    } catch (error) {
      console.error('Error fetching goals:', error);
      Alert.alert('Error', 'Failed to load goals data');
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = async () => {
    try {
      const uid = auth?.currentUser?.uid;
      if (!uid) return;

      const now = new Date();

      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const oneWeekAgo = startOfWeek;
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const today = new Date().toISOString().split('T')[0];

      // Fetch workouts
      let workouts = [];
      try {
        const workoutsQuery = query(
          collection(db, 'workouts'),
          where('userId', '==', uid),
          where('createdAt', '>=', monthStart)
        );

        const workoutsSnapshot = await getDocs(workoutsQuery);
        workouts = workoutsSnapshot.docs.map((d) => {
          const data = d.data();
          data.createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
          return data;
        });
      } catch (workoutError) {
        console.log('Could not fetch workouts for progress calculation:', workoutError.message);
      }

      // Weekly workouts + minutes
      const thisWeekWorkouts = workouts.filter((w) => {
        const date = w.createdAt?.toDate?.() || new Date(w.createdAt);
        return date >= oneWeekAgo;
      });

      const weeklyWorkoutsCount = thisWeekWorkouts.length;
      const weeklyDurationCount = thisWeekWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0);

      // Monthly workouts
      const thisMonthWorkouts = workouts.filter((w) => {
        const date = w.createdAt?.toDate?.() || new Date(w.createdAt);
        return date >= monthStart;
      });

      // Daily water
      let dailyWaterCount = 0;
      try {
        const waterDoc = await getDoc(doc(db, 'water_intake', `${uid}_${today}`));
        dailyWaterCount = waterDoc.exists() ? waterDoc.data().glasses : 0;
      } catch (waterError) {
        console.log('Could not fetch water data:', waterError.message);
      }

      setProgress({
        weeklyWorkouts: weeklyWorkoutsCount,
        weeklyDuration: weeklyDurationCount,
        dailyWater: dailyWaterCount,
        monthlyWorkouts: thisMonthWorkouts.length,
      });
    } catch (error) {
      console.error('Error calculating progress:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchGoalsAndProgress();
    setRefreshing(false);
  };

  const addWaterGlass = async () => {
    try {
      const uid = auth?.currentUser?.uid;
      if (!uid) return;

      const today = new Date().toISOString().split('T')[0];
      const waterDocRef = doc(db, 'water_intake', `${uid}_${today}`);
      const waterDoc = await getDoc(waterDocRef);
      const currentGlasses = waterDoc.exists() ? waterDoc.data().glasses : 0;

      await setDoc(
        waterDocRef,
        {
          userId: uid,
          date: today,
          glasses: currentGlasses + 1,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      try {
        await recordWaterGamification(uid, 1);
      } catch (e) {
        // ignore
      }

      setProgress((prev) => ({
        ...prev,
        dailyWater: currentGlasses + 1,
      }));

      Alert.alert('Nice!', `Water glass added! Total today: ${currentGlasses + 1}`);
    } catch (error) {
      Alert.alert('Error', `Failed to add water glass: ${error.message}`);
    }
  };

  const getGoalTitle = (goalType) => {
    switch (goalType) {
      case 'weeklyWorkouts':
        return 'Weekly Workouts';
      case 'weeklyDuration':
        return 'Weekly Minutes';
      case 'dailyWater':
        return 'Daily Water';
      case 'monthlyWorkouts':
        return 'Monthly Workouts';
      default:
        return '';
    }
  };

  /** ✅ Each goal has its own distinct icon */
  const getGoalIcon = (goalType) => {
    switch (goalType) {
      case 'weeklyWorkouts':
        return { pack: 'Ion', name: 'barbell-outline' };
      case 'weeklyDuration':
        return { pack: 'MCI', name: 'timer-sand' };
      case 'dailyWater':
        return { pack: 'Ion', name: 'water-outline' };
      case 'monthlyWorkouts':
        return { pack: 'Ion', name: 'calendar-outline' };
      default:
        return { pack: 'Ion', name: 'radio-button-on-outline' };
    }
  };

  const getProgressPercentage = (goalType) => {
    const goal = safeNum(goals[goalType]);
    const current = safeNum(progress[goalType]);
    if (!goal || goal === 0) return 0;
    return clamp(Math.round((current / goal) * 100), 0, 100);
  };

  const formatGoalUnit = (goalType, n) => {
    if (goalType === 'dailyWater') return `${n} glasses`;
    if (goalType === 'weeklyDuration') return `${n} min`;
    return `${n}`;
  };

  const Card = ({ children, style }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, style]}>
      {children}
    </View>
  );

  const GoalCard = ({ goalType }) => {
    const percentage = getProgressPercentage(goalType);
    const isCompleted = percentage >= 100;

    const current = safeNum(progress[goalType]);
    const target = safeNum(goals[goalType]);
    const icon = getGoalIcon(goalType);

    return (
      <View
        style={[
          styles.goalCard,
          {
            backgroundColor: theme === 'light' ? '#FFFFFF' : '#0B1120',
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.goalHeader}>
          <View style={[styles.goalIconBubble, { backgroundColor: GOALS_ACCENT + '18' }]}>
            {icon.pack === 'Ion' ? (
              <Ionicons name={icon.name} size={18} color={GOALS_ACCENT} />
            ) : (
              <MaterialCommunityIcons name={icon.name} size={18} color={GOALS_ACCENT} />
            )}
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[styles.goalTitle, { color: colors.text }]}>{getGoalTitle(goalType)}</Text>
            <Text style={[styles.goalProgress, { color: colors.subtext }]}>
              {formatGoalUnit(goalType, current)} / {formatGoalUnit(goalType, target)}
            </Text>
          </View>

          <View style={styles.goalRight}>
            <View
              style={[
                styles.percentPill,
                {
                  backgroundColor: isCompleted ? '#16A34A22' : GOALS_ACCENT + '18',
                  borderColor: isCompleted ? '#16A34A55' : GOALS_ACCENT + '35',
                },
              ]}
            >
              <Text style={[styles.percentText, { color: isCompleted ? '#16A34A' : GOALS_ACCENT }]}>
                {percentage}%
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.modifyButton, { backgroundColor: GOALS_ACCENT }]}
              onPress={() => navigation.navigate('EditGoal', { goalType, currentValue: target })}
              activeOpacity={0.85}
            >
              <Text style={styles.modifyButtonText}>Modify</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.progressBarContainer, { backgroundColor: theme === 'light' ? '#EEF2FF' : '#111827' }]}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${percentage}%`,
                backgroundColor: isCompleted ? '#16A34A' : GOALS_ACCENT,
              },
            ]}
          />
        </View>

        {/* Keep your water add action in the relevant goal card only */}
        {goalType === 'dailyWater' && (
          <TouchableOpacity
            style={[styles.inlineAction, { borderColor: colors.border }]}
            onPress={addWaterGlass}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle-outline" size={18} color={GOALS_ACCENT} />
            <Text style={[styles.inlineActionText, { color: colors.text }]}>Add 1 glass</Text>
          </TouchableOpacity>
        )}

        {isCompleted && <Text style={styles.completedMessage}>🎉 Goal Completed!</Text>}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={GOALS_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          {/* ✅ SafeArea INSIDE header so gradient reaches TOP */}
          <SafeAreaView>
            <View style={styles.headerTop}>
              <Text style={styles.headerTitle}>Goals</Text>
              <Text style={styles.headerSubtitle}>Set targets. Track habits.</Text>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View style={styles.loadingWrap}>
          <Text style={[styles.loadingText, { color: colors.subtext }]}>Loading goals…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ✅ Header expands to TOP (gradient starts at y=0) */}
      <LinearGradient
        colors={GOALS_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        {/* ✅ SafeArea INSIDE header so content clears notch */}
        <SafeAreaView>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Goals</Text>
              <Text style={styles.headerSubtitle}>Set targets. Track habits.</Text>
            </View>

            <TouchableOpacity activeOpacity={0.9} style={styles.refreshBtn} onPress={onRefresh}>
              <Ionicons name="refresh" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOALS_ACCENT} />}
      >
        <View style={styles.section}>
          <Card>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.cardHeaderIcon, { backgroundColor: GOALS_ACCENT + '18' }]}>
                <Ionicons name="trophy-outline" size={16} color={GOALS_ACCENT} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Your Goals</Text>
                <Text style={[styles.cardSubtitle, { color: colors.subtext }]}>
                  Track progress and adjust targets anytime.
                </Text>
              </View>
            </View>

            <View style={{ marginTop: 4 }}>
              {Object.keys(goals).map((goalType) => (
                <GoalCard key={goalType} goalType={goalType} />
              ))}
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <LinearGradient
            colors={['#111827', '#1D4ED8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.motivationCard}
          >
            <View style={styles.motivationTopRow}>
              <View style={styles.motivationIconWrap}>
                <MaterialCommunityIcons name="bullseye-arrow" size={18} color="#fff" />
              </View>
              <Text style={styles.motivationTitle}>Stay focused</Text>
            </View>

            <Text style={styles.motivationText}>
              Small steps done consistently beat big steps done rarely.
            </Text>
            <Text style={styles.motivationAuthor}>— BeFit</Text>
          </LinearGradient>
        </View>
      </ScrollView>
    </View>
  );
};

export default GoalsScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },

  /** Header */
  headerGradient: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 14 : 8,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: { marginTop: 8 },
  headerRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#fff' },
  headerSubtitle: { marginTop: 2, fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },

  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },

  /** Sections */
  section: { paddingHorizontal: 20, marginTop: 12 },

  card: {
    borderRadius: 26,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderWidth: 1,
  },

  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  cardHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 18, fontWeight: '900' },
  cardSubtitle: { fontSize: 12, fontWeight: '700', marginTop: 2 },

  /** Goal cards */
  goalCard: {
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  goalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  goalIconBubble: {
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalTitle: { fontSize: 15, fontWeight: '900' },
  goalProgress: { fontSize: 12, fontWeight: '700', marginTop: 3 },

  goalRight: { alignItems: 'flex-end', gap: 8 },
  percentPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  percentText: { fontSize: 12, fontWeight: '900' },

  modifyButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  modifyButtonText: { color: '#fff', fontSize: 12, fontWeight: '900' },

  progressBarContainer: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBar: { height: '100%', borderRadius: 999 },

  inlineAction: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent',
  },
  inlineActionText: { fontSize: 13, fontWeight: '900' },

  completedMessage: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '900',
    color: '#16A34A',
  },

  /** Motivation */
  motivationCard: {
    borderRadius: 26,
    padding: 18,
  },
  motivationTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  motivationIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  motivationTitle: { fontSize: 16, fontWeight: '900', color: '#fff' },
  motivationText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.92)',
    lineHeight: 20,
  },
  motivationAuthor: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.75)',
  },

  /** Loading */
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 14, fontWeight: '800' },
});
