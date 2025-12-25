// src/screens/HomeScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Image,
  Platform,
  UIManager,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Ionicons,
  FontAwesome5,
  MaterialCommunityIcons,
} from '@expo/vector-icons';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../services/firebase';
import { useTheme } from './ThemeContext';
import { lightTheme, darkTheme } from './themes';
import { readGamification } from '../gamification/engine';

// Enable LayoutAnimation on Android (kept if you use later)
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Helper function to get badge color based on level
const getLevelColor = (levelName) => {
  switch (levelName?.toLowerCase()) {
    case 'bronze':
      return '#CD7F32';
    case 'silver':
      return '#C0C0C0';
    case 'gold':
      return '#FFD700';
    case 'platinum':
      return '#E5E4E2';
    default:
      return '#CD7F32';
  }
};

// Helper function to get badge icon based on level
const getLevelIcon = (levelName) => {
  switch (levelName?.toLowerCase()) {
    case 'bronze':
      return 'medal-outline';
    case 'silver':
      return 'medal';
    case 'gold':
      return 'crown-outline';
    case 'platinum':
      return 'crown';
    default:
      return 'medal-outline';
  }
};

const HomeScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  const [userData, setUserData] = useState(null);
  const [todayStats, setTodayStats] = useState({
    workouts: 0,
    totalDuration: 0,
    calories: 0,
  });
  const [recentWorkouts, setRecentWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [targets, setTargets] = useState({
    workoutTarget: 1,
    durationTarget: 45,
    caloriesTarget: 400,
  });

  const [weeklySummary, setWeeklySummary] = useState({
    workoutsTotal: 0,
    durationTotal: 0,
    caloriesTotal: 0,
  });

  // detailed weekly series for mini-graphs
  const [weeklySeries, setWeeklySeries] = useState({
    labels: [], // ['M','T',...]
    workouts: [],
    duration: [],
    calories: [],
  });

  // local water mini-state for hero + modal
  const [waterStats, setWaterStats] = useState({
    glasses: 3,
    target: 8,
  });

  // which metric detail modal is open
  const [activeMetric, setActiveMetric] = useState(null);

  // gamification/badge level state
  const [badgeLevel, setBadgeLevel] = useState('Bronze');
  const [xp, setXp] = useState(0);

  const { theme } = useTheme();
  const colors = theme === 'light' ? lightTheme : darkTheme;

  const workoutTarget = targets.workoutTarget || 1;
  const durationTarget = targets.durationTarget || 45;
  const caloriesTarget = targets.caloriesTarget || 400;

  const totalWorkouts = userData?.totalWorkouts || 0;

  const workoutPct = Math.min(
    todayStats.workouts / Math.max(workoutTarget, 1),
    1
  );
  const durationPct = Math.min(
    todayStats.totalDuration / Math.max(durationTarget, 1),
    1
  );
  const caloriesPct = Math.min(
    todayStats.calories / Math.max(caloriesTarget, 1),
    1
  );
  const waterPct = Math.min(
    waterStats.glasses / Math.max(waterStats.target, 1),
    1
  );

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      await Promise.all([
        fetchUserData(),
        fetchTodayStats(),
        fetchRecentWorkouts(),
        fetchGamificationData(),
      ]);
    } catch (err) {
      console.error('Error fetching home data:', err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  };

  const fetchUserData = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserData(data);
        setTargets({
          workoutTarget: data.workoutTarget || 1,
          durationTarget: data.durationTarget || 45,
          caloriesTarget: data.caloriesTarget || 400,
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  // Fetch gamification data for badge level
  const fetchGamificationData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const data = await readGamification(user.uid);
      if (data) {
        setBadgeLevel(data.levelName || 'Bronze');
        setXp(data.xp || 0);
      }
    } catch (error) {
      console.error('Error fetching gamification data:', error);
    }
  };

  const fetchTodayStats = async () => {
    try {
      const today = new Date().toDateString();
      const workoutsQuery = query(
        collection(db, 'workouts'),
        where('userId', '==', auth.currentUser.uid),
        where('date', '==', today)
      );

      const querySnapshot = await getDocs(workoutsQuery);

      let workoutCount = 0;
      let totalDuration = 0;
      let estimatedCalories = 0;

      querySnapshot.forEach((docSnap) => {
        const workout = docSnap.data();
        workoutCount++;
        const duration = workout.duration || 0;
        totalDuration += duration;
        const caloriesPerMinute =
          workout.type === 'cardio' ? 8 : workout.type === 'strength' ? 6 : 4;
        estimatedCalories += duration * caloriesPerMinute;
      });

      setTodayStats({
        workouts: workoutCount,
        totalDuration,
        calories: estimatedCalories,
      });
    } catch (error) {
      console.error('Error fetching today stats:', error);
    }
  };

  const fetchRecentWorkouts = async () => {
    try {
      const workoutsQuery = query(
        collection(db, 'workouts'),
        where('userId', '==', auth.currentUser.uid)
      );
      const querySnapshot = await getDocs(workoutsQuery);
      let workoutList = querySnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      workoutList.sort((a, b) => {
        try {
          const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
          const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
          return dateB - dateA;
        } catch {
          return 0;
        }
      });

      // Build 7-day window [start ... now]
      const now = new Date();
      const start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 6,
        0,
        0,
        0,
        0
      );

      const labels = [];
      const weeklyWorkouts = Array(7).fill(0);
      const weeklyDuration = Array(7).fill(0);
      const weeklyCalories = Array(7).fill(0);

      for (let i = 0; i < 7; i++) {
        const d = new Date(start.getTime() + i * MS_PER_DAY);
        labels.push(
          d.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)
        );
      }

      let workoutsTotal = 0;
      let durationTotal = 0;
      let caloriesTotal = 0;

      workoutList.forEach((w) => {
        try {
          const d =
            w.createdAt?.toDate?.() || new Date(w.createdAt || Date.now());
          if (d >= start && d <= now) {
            const dayIndex = Math.floor(
              (new Date(d.getFullYear(), d.getMonth(), d.getDate()) - start) /
                MS_PER_DAY
            );
            if (dayIndex >= 0 && dayIndex < 7) {
              const dur = w.duration || 0;
              const caloriesPerMinute =
                w.type === 'cardio'
                  ? 8
                  : w.type === 'strength'
                  ? 6
                  : 4;
              const cal = dur * caloriesPerMinute;

              weeklyWorkouts[dayIndex] += 1;
              weeklyDuration[dayIndex] += dur;
              weeklyCalories[dayIndex] += cal;

              workoutsTotal++;
              durationTotal += dur;
              caloriesTotal += cal;
            }
          }
        } catch {
          // ignore bad dates
        }
      });

      setWeeklySummary({
        workoutsTotal,
        durationTotal,
        caloriesTotal,
      });

      setWeeklySeries({
        labels,
        workouts: weeklyWorkouts,
        duration: weeklyDuration,
        calories: weeklyCalories,
      });

      setRecentWorkouts(workoutList.slice(0, 5));
    } catch (error) {
      console.error('Error fetching recent workouts:', error);
    }
  };

  // helper: absolute target setter (better customization)
  const setTargetValue = (key, value) => {
    const safeValue = Math.max(1, value || 1);
    setTargets((prev) => {
      const updated = { ...prev, [key]: safeValue };
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        updateDoc(userRef, {
          workoutTarget: updated.workoutTarget,
          durationTarget: updated.durationTarget,
          caloriesTarget: updated.caloriesTarget,
        }).catch((err) => console.error('Error saving targets:', err));
      }
      return updated;
    });
  };

  // legacy +/- target (still used by buttons)
  const updateTarget = (key, delta) => {
    setTargets((prev) => {
      const current = prev[key] || 0;
      const newValue = Math.max(1, current + delta);
      const updated = { ...prev, [key]: newValue };

      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        updateDoc(userRef, {
          workoutTarget: updated.workoutTarget,
          durationTarget: updated.durationTarget,
          caloriesTarget: updated.caloriesTarget,
        }).catch((err) => console.error('Error saving targets:', err));
      }

      return updated;
    });
  };

  // local water target editor for hero + modal
  const updateWaterTarget = (delta) => {
    setWaterStats((prev) => ({
      ...prev,
      target: Math.max(1, prev.target + delta),
    }));
  };

  const setWaterTargetValue = (value) => {
    setWaterStats((prev) => ({
      ...prev,
      target: Math.max(1, value || 1),
    }));
  };

  /** ---- Small generic weekly mini-chart ---- **/
  const WeeklyMiniChart = ({ data, labels, color }) => {
    const max = Math.max(...data, 1);
    return (
      <View style={styles.weeklyChartRow}>
        {data.map((v, idx) => {
          const h = Math.max((v / max) * 72, 4);
          return (
            <View key={idx} style={styles.weeklyChartCol}>
              <View style={styles.weeklyChartBarWrapper}>
                <View
                  style={[
                    styles.weeklyChartBar,
                    {
                      height: h,
                      backgroundColor: v === 0 ? colors.border : color,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.weeklyChartLabel, { color: colors.subtext }]}>
                {labels[idx]}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  /** ---- UI COMPONENTS ---- **/

  const HeroCard = () => {
    const tileBg = theme === 'light' ? '#F3F4F6' : '#0B1120';
    const barBg = theme === 'light' ? '#E5E7EB' : '#111827';

    return (
      <View style={styles.heroWrapper}>
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.heroTopRow}>
            <View>
              <Text style={[styles.heroTitle, { color: colors.text }]}>
                Today&apos;s Progress
              </Text>
              <Text style={[styles.heroSubtitle, { color: colors.subtext }]}>
                One screen. All your core stats.
              </Text>
            </View>
            <View
              style={[
                styles.heroBadgeLight,
                {
                  backgroundColor:
                    theme === 'light' ? '#FFF7ED' : 'rgba(251,146,60,0.12)',
                },
              ]}
            >
              <Ionicons name="flame" size={16} color="#FB923C" />
              <Text
                style={[
                  styles.heroBadgeTextLight,
                  { color: theme === 'light' ? '#C05621' : '#FB923C' },
                ]}
              >
                {weeklySummary.workoutsTotal} this week
              </Text>
            </View>
          </View>

          <View style={styles.heroGrid}>
            {/* Workouts */}
            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.heroTile, { backgroundColor: tileBg }]}
              onPress={() => setActiveMetric('workouts')}
            >
              <View style={[styles.heroIconBubble, { backgroundColor: '#FF7043' }]}>
                <FontAwesome5 name="dumbbell" size={18} color="#fff" />
              </View>
              <Text style={[styles.heroTileLabel, { color: colors.text }]}>
                Workouts
              </Text>
              <Text style={[styles.heroTileValue, { color: colors.text }]}>
                {todayStats.workouts}
                <Text style={[styles.heroTileUnit, { color: colors.subtext }]}>
                  {' '}
                  / {workoutTarget}
                </Text>
              </Text>
              <View style={[styles.heroBarBg, { backgroundColor: barBg }]}>
                <View
                  style={[
                    styles.heroBarFill,
                    {
                      width: `${Math.min(workoutPct, 1) * 100}%`,
                      backgroundColor: '#FF7043',
                    },
                  ]}
                />
              </View>
              <Text style={[styles.heroTileHint, { color: colors.subtext }]}>
                Tap for detailed stats
              </Text>
            </TouchableOpacity>

            {/* Duration */}
            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.heroTile, { backgroundColor: tileBg }]}
              onPress={() => setActiveMetric('duration')}
            >
              <View style={[styles.heroIconBubble, { backgroundColor: '#FF6B81' }]}>
                <Ionicons name="timer-outline" size={20} color="#fff" />
              </View>
              <Text style={[styles.heroTileLabel, { color: colors.text }]}>
                Duration
              </Text>
              <Text style={[styles.heroTileValue, { color: colors.text }]}>
                {todayStats.totalDuration}
                <Text style={[styles.heroTileUnit, { color: colors.subtext }]}>
                  {' '}
                  / {durationTarget} min
                </Text>
              </Text>
              <View style={[styles.heroBarBg, { backgroundColor: barBg }]}>
                <View
                  style={[
                    styles.heroBarFill,
                    {
                      width: `${Math.min(durationPct, 1) * 100}%`,
                      backgroundColor: '#FF6B81',
                    },
                  ]}
                />
              </View>
              <Text style={[styles.heroTileHint, { color: colors.subtext }]}>
                Tap to fine-tune goal
              </Text>
            </TouchableOpacity>

            {/* Calories */}
            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.heroTile, { backgroundColor: tileBg }]}
              onPress={() => setActiveMetric('calories')}
            >
              <View style={[styles.heroIconBubble, { backgroundColor: '#FF9800' }]}>
                <MaterialCommunityIcons name="fire" size={20} color="#fff" />
              </View>
              <Text style={[styles.heroTileLabel, { color: colors.text }]}>
                Calories
              </Text>
              <Text style={[styles.heroTileValue, { color: colors.text }]}>
                {todayStats.calories}
                <Text style={[styles.heroTileUnit, { color: colors.subtext }]}>
                  {' '}
                  / {caloriesTarget} kcal
                </Text>
              </Text>
              <View style={[styles.heroBarBg, { backgroundColor: barBg }]}>
                <View
                  style={[
                    styles.heroBarFill,
                    {
                      width: `${Math.min(caloriesPct, 1) * 100}%`,
                      backgroundColor: '#FF9800',
                    },
                  ]}
                />
              </View>
              <Text style={[styles.heroTileHint, { color: colors.subtext }]}>
                Tap for burn breakdown
              </Text>
            </TouchableOpacity>

            {/* Water */}
            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.heroTile, { backgroundColor: tileBg }]}
              onPress={() => setActiveMetric('water')}
            >
              <View style={[styles.heroIconBubble, { backgroundColor: '#29B6F6' }]}>
                <Ionicons name="water-outline" size={20} color="#fff" />
              </View>
              <Text style={[styles.heroTileLabel, { color: colors.text }]}>
                Water
              </Text>
              <Text style={[styles.heroTileValue, { color: colors.text }]}>
                {waterStats.glasses}
                <Text style={[styles.heroTileUnit, { color: colors.subtext }]}>
                  {' '}
                  / {waterStats.target} cups
                </Text>
              </Text>
              <View style={[styles.heroBarBg, { backgroundColor: barBg }]}>
                <View
                  style={[
                    styles.heroBarFill,
                    {
                      width: `${Math.min(waterPct, 1) * 100}%`,
                      backgroundColor: '#29B6F6',
                    },
                  ]}
                />
              </View>
              <Text style={[styles.heroTileHint, { color: colors.subtext }]}>
                Tap for hydration stats
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const ActionButton = ({ title, onPress, color, icon, subtitle }) => {
    const border = color || colors.accent;
    const bg = colors.card;

    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        style={[
          styles.actionButton,
          {
            borderColor: border,
            backgroundColor: bg,
            shadowColor: border,
          },
        ]}
      >
        <View style={[styles.actionIconBubble, { backgroundColor: border }]}>
          {icon}
        </View>
        <View style={styles.actionTextContainer}>
          <Text style={[styles.actionButtonTitle, { color: colors.text }]}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.actionButtonSubtitle, { color: colors.subtext }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={colors.subtext}
          style={{ marginLeft: 'auto' }}
        />
      </TouchableOpacity>
    );
  };

  const QuickActionsSection = () => {
    return (
      <View style={styles.sectionFullPage}>
        <View
          style={[
            styles.quickCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.quickTitle, { color: colors.text }]}>
            Quick Actions
          </Text>
          <Text style={[styles.quickSubtitle, { color: colors.subtext }]}>
            Big buttons for the things you do every day.
          </Text>

          <View style={styles.actionGrid}>
            <ActionButton
              title="Log Workout"
              subtitle="Add a new training session"
              onPress={() => navigation.navigate('Workout')}
              color="#FB923C"
              icon={<FontAwesome5 name="dumbbell" size={18} color="#fff" />}
            />
            <ActionButton
              title="Track Water"
              subtitle="Open full hydration tracker"
              onPress={() => navigation.navigate('WaterTracker')}
              color="#38BDF8"
              icon={<Ionicons name="water-outline" size={18} color="#fff" />}
            />
            <ActionButton
              title="Log Food"
              subtitle="Track your meals & macros"
              onPress={() => navigation.navigate('Nutrition')}
              color="#FB7185"
              icon={
                <MaterialCommunityIcons
                  name="food-apple-outline"
                  size={18}
                  color="#fff"
                />
              }
            />
            <ActionButton
              title="View Progress"
              subtitle="See trends & history"
              onPress={() => navigation.navigate('Progress')}
              color="#4ADE80"
              icon={<Ionicons name="stats-chart-outline" size={18} color="#fff" />}
            />
            <ActionButton
              title="Edit Profile"
              subtitle="Update your details"
              onPress={() => navigation.navigate('EditProfile')}
              color="#A855F7"
              icon={<Ionicons name="person-circle-outline" size={18} color="#fff" />}
            />
          </View>
        </View>
      </View>
    );
  };

  const RecentWorkoutItem = ({ workout }) => {
    let dateLabel = '';
    try {
      const d =
        workout.createdAt?.toDate?.() ||
        new Date(workout.createdAt || Date.now());
      dateLabel = d.toLocaleDateString();
    } catch {
      dateLabel = '';
    }

    return (
      <View
        style={[
          styles.recentWorkoutItem,
          {
            borderBottomColor: colors.border,
            backgroundColor: colors.card,
          },
        ]}
      >
        <View style={styles.recentWorkoutInfo}>
          <Text style={[styles.recentWorkoutName, { color: colors.text }]}>
            {workout.exercise || 'Workout'}
          </Text>
          <Text style={[styles.recentWorkoutDetails, { color: colors.subtext }]}>
            {workout.duration || 0} min • {workout.type || 'general'}
          </Text>
        </View>
        <Text style={[styles.recentWorkoutDate, { color: colors.subtext }]}>
          {dateLabel}
        </Text>
      </View>
    );
  };

  /** Metric detail modal content **/
  const renderMetricDetail = () => {
    if (!activeMetric) return null;

    const avg = (total, denom) => (denom > 0 ? (total / denom).toFixed(1) : '0.0');

    const softCardBg =
      theme === 'light' ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.06)';
    const chipBg = theme === 'light' ? '#E5E7EB' : 'rgba(255,255,255,0.10)';
    const chipText = theme === 'light' ? '#111827' : '#F9FAFB';

    switch (activeMetric) {
      case 'workouts': {
        const pct = Math.round(workoutPct * 100);
        const { labels, workouts } = weeklySeries;
        const bestIndex =
          workouts.length > 0 ? workouts.indexOf(Math.max(...workouts)) : -1;
        const bestDay = bestIndex >= 0 ? labels[bestIndex] : '–';

        return (
          <View>
            <Text style={[styles.metricModalTitle, { color: colors.text }]}>
              Workouts Today
            </Text>
            <Text style={[styles.metricModalSubtitle, { color: colors.subtext }]}>
              You&apos;ve logged {todayStats.workouts} workout(s) today. Target is{' '}
              {workoutTarget} sessions.
            </Text>

            <View style={styles.detailBarRow}>
              <Text style={[styles.detailBarLabel, { color: colors.subtext }]}>
                Today vs goal
              </Text>
              <Text style={[styles.detailBarValue, { color: colors.text }]}>
                {todayStats.workouts}/{workoutTarget} ({pct}%)
              </Text>
            </View>

            <View style={[styles.detailBarBg, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.detailBarFill,
                  {
                    width: `${Math.min(Math.max(workoutPct || 0, 0), 1) * 100}%`,
                    backgroundColor: '#FF7043',
                  },
                ]}
              />
            </View>

            <Text
              style={[
                styles.metricModalSubtitle,
                { color: colors.subtext, marginTop: 16 },
              ]}
            >
              Weekly trend (last 7 days)
            </Text>
            <WeeklyMiniChart
              data={weeklySeries.workouts}
              labels={weeklySeries.labels}
              color="#FF7043"
            />

            <View style={styles.metricStatsRow}>
              <View style={[styles.metricStatsItem, { backgroundColor: softCardBg }]}>
                <Text style={[styles.metricStatsLabel, { color: colors.subtext }]}>
                  Total this week
                </Text>
                <Text style={[styles.metricStatsValue, { color: colors.text }]}>
                  {weeklySummary.workoutsTotal} sessions
                </Text>
              </View>
              <View style={[styles.metricStatsItem, { backgroundColor: softCardBg }]}>
                <Text style={[styles.metricStatsLabel, { color: colors.subtext }]}>
                  Best day
                </Text>
                <Text style={[styles.metricStatsValue, { color: colors.text }]}>
                  {bestDay}
                </Text>
              </View>
            </View>

            <View style={[styles.targetEditRow, { backgroundColor: softCardBg }]}>
              <Text style={[styles.detailBarLabel, { color: colors.subtext }]}>
                Daily target
              </Text>
              <View style={styles.targetEditButtons}>
                <TouchableOpacity
                  style={[styles.targetButton, { borderColor: colors.border }]}
                  onPress={() => updateTarget('workoutTarget', -1)}
                >
                  <Text style={{ color: colors.text }}>-</Text>
                </TouchableOpacity>
                <Text style={[styles.targetValue, { color: colors.text }]}>
                  {workoutTarget}
                </Text>
                <TouchableOpacity
                  style={[styles.targetButton, { borderColor: colors.border }]}
                  onPress={() => updateTarget('workoutTarget', 1)}
                >
                  <Text style={{ color: colors.text }}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.targetPresetRow}>
              <Text style={[styles.targetPresetLabel, { color: colors.subtext }]}>
                Quick presets
              </Text>
              <View style={styles.targetPresetChips}>
                <TouchableOpacity
                  style={[styles.targetPresetChip, { backgroundColor: chipBg }]}
                  onPress={() => setTargetValue('workoutTarget', 1)}
                >
                  <Text style={[styles.targetPresetText, { color: chipText }]}>
                    Easy (1)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.targetPresetChip, { backgroundColor: chipBg }]}
                  onPress={() => setTargetValue('workoutTarget', 2)}
                >
                  <Text style={[styles.targetPresetText, { color: chipText }]}>
                    Standard (2)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.targetPresetChip, { backgroundColor: chipBg }]}
                  onPress={() => setTargetValue('workoutTarget', 3)}
                >
                  <Text style={[styles.targetPresetText, { color: chipText }]}>
                    Intense (3)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
      }

      case 'duration': {
        const pct = Math.round(durationPct * 100);
        const { labels, duration } = weeklySeries;
        const bestIndex =
          duration.length > 0 ? duration.indexOf(Math.max(...duration)) : -1;
        const bestDay = bestIndex >= 0 ? labels[bestIndex] : '–';

        return (
          <View>
            <Text style={[styles.metricModalTitle, { color: colors.text }]}>
              Duration
            </Text>
            <Text style={[styles.metricModalSubtitle, { color: colors.subtext }]}>
              You&apos;ve done {todayStats.totalDuration} minutes today. Goal is{' '}
              {durationTarget} minutes.
            </Text>

            <View style={styles.detailBarRow}>
              <Text style={[styles.detailBarLabel, { color: colors.subtext }]}>
                Today&apos;s progress
              </Text>
              <Text style={[styles.detailBarValue, { color: colors.text }]}>
                {pct}%
              </Text>
            </View>

            <View style={[styles.detailBarBg, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.detailBarFill,
                  {
                    width: `${Math.min(Math.max(durationPct || 0, 0), 1) * 100}%`,
                    backgroundColor: '#FF6B81',
                  },
                ]}
              />
            </View>

            <Text
              style={[
                styles.metricModalSubtitle,
                { color: colors.subtext, marginTop: 16 },
              ]}
            >
              Weekly trend (last 7 days)
            </Text>
            <WeeklyMiniChart
              data={weeklySeries.duration}
              labels={weeklySeries.labels}
              color="#FF6B81"
            />

            <View style={styles.metricStatsRow}>
              <View style={[styles.metricStatsItem, { backgroundColor: softCardBg }]}>
                <Text style={[styles.metricStatsLabel, { color: colors.subtext }]}>
                  Total this week
                </Text>
                <Text style={[styles.metricStatsValue, { color: colors.text }]}>
                  {weeklySummary.durationTotal} min
                </Text>
              </View>
              <View style={[styles.metricStatsItem, { backgroundColor: softCardBg }]}>
                <Text style={[styles.metricStatsLabel, { color: colors.subtext }]}>
                  Avg / day
                </Text>
                <Text style={[styles.metricStatsValue, { color: colors.text }]}>
                  {avg(weeklySummary.durationTotal, 7)} min
                </Text>
              </View>
              <View style={[styles.metricStatsItem, { backgroundColor: softCardBg }]}>
                <Text style={[styles.metricStatsLabel, { color: colors.subtext }]}>
                  Best day
                </Text>
                <Text style={[styles.metricStatsValue, { color: colors.text }]}>
                  {bestDay}
                </Text>
              </View>
            </View>

            <View style={[styles.targetEditRow, { backgroundColor: softCardBg }]}>
              <Text style={[styles.detailBarLabel, { color: colors.subtext }]}>
                Daily target
              </Text>
              <View style={styles.targetEditButtons}>
                <TouchableOpacity
                  style={[styles.targetButton, { borderColor: colors.border }]}
                  onPress={() => updateTarget('durationTarget', -5)}
                >
                  <Text style={{ color: colors.text }}>-5</Text>
                </TouchableOpacity>
                <Text style={[styles.targetValue, { color: colors.text }]}>
                  {durationTarget} min
                </Text>
                <TouchableOpacity
                  style={[styles.targetButton, { borderColor: colors.border }]}
                  onPress={() => updateTarget('durationTarget', 5)}
                >
                  <Text style={{ color: colors.text }}>+5</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.targetPresetRow}>
              <Text style={[styles.targetPresetLabel, { color: colors.subtext }]}>
                Quick presets
              </Text>
              <View style={styles.targetPresetChips}>
                <TouchableOpacity
                  style={[styles.targetPresetChip, { backgroundColor: chipBg }]}
                  onPress={() => setTargetValue('durationTarget', 30)}
                >
                  <Text style={[styles.targetPresetText, { color: chipText }]}>
                    30 min
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.targetPresetChip, { backgroundColor: chipBg }]}
                  onPress={() => setTargetValue('durationTarget', 45)}
                >
                  <Text style={[styles.targetPresetText, { color: chipText }]}>
                    45 min
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.targetPresetChip, { backgroundColor: chipBg }]}
                  onPress={() => setTargetValue('durationTarget', 60)}
                >
                  <Text style={[styles.targetPresetText, { color: chipText }]}>
                    60 min
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
      }

      case 'calories': {
        const pct = Math.round(caloriesPct * 100);

        return (
          <View>
            <Text style={[styles.metricModalTitle, { color: colors.text }]}>
              Calories
            </Text>
            <Text style={[styles.metricModalSubtitle, { color: colors.subtext }]}>
              Estimated burn of {todayStats.calories} kcal today.
            </Text>

            <View style={styles.detailBarRow}>
              <Text style={[styles.detailBarLabel, { color: colors.subtext }]}>
                Today vs target
              </Text>
              <Text style={[styles.detailBarValue, { color: colors.text }]}>
                {pct}%
              </Text>
            </View>

            <View style={[styles.detailBarBg, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.detailBarFill,
                  {
                    width: `${Math.min(Math.max(caloriesPct || 0, 0), 1) * 100}%`,
                    backgroundColor: '#FF9800',
                  },
                ]}
              />
            </View>

            <View style={styles.flameRowLarge}>
              {Array.from({ length: 5 }).map((_, index) => {
                const threshold = ((index + 1) / 5) * 100;
                const filled = pct >= threshold;
                return (
                  <MaterialCommunityIcons
                    key={index}
                    name="fire"
                    size={30}
                    color={filled ? '#FF9800' : colors.border}
                    style={{ marginHorizontal: 4 }}
                  />
                );
              })}
            </View>

            <Text
              style={[
                styles.metricModalSubtitle,
                { color: colors.subtext, marginTop: 16 },
              ]}
            >
              Weekly trend (last 7 days)
            </Text>
            <WeeklyMiniChart
              data={weeklySeries.calories}
              labels={weeklySeries.labels}
              color="#FF9800"
            />

            <View style={styles.metricStatsRow}>
              <View style={[styles.metricStatsItem, { backgroundColor: softCardBg }]}>
                <Text style={[styles.metricStatsLabel, { color: colors.subtext }]}>
                  Total this week
                </Text>
                <Text style={[styles.metricStatsValue, { color: colors.text }]}>
                  {Math.round(weeklySummary.caloriesTotal)} kcal
                </Text>
              </View>
              <View style={[styles.metricStatsItem, { backgroundColor: softCardBg }]}>
                <Text style={[styles.metricStatsLabel, { color: colors.subtext }]}>
                  Avg / day
                </Text>
                <Text style={[styles.metricStatsValue, { color: colors.text }]}>
                  {avg(weeklySummary.caloriesTotal, 7)} kcal
                </Text>
              </View>
            </View>

            <View style={[styles.targetEditRow, { backgroundColor: softCardBg }]}>
              <Text style={[styles.detailBarLabel, { color: colors.subtext }]}>
                Daily target
              </Text>
              <View style={styles.targetEditButtons}>
                <TouchableOpacity
                  style={[styles.targetButton, { borderColor: colors.border }]}
                  onPress={() => updateTarget('caloriesTarget', -50)}
                >
                  <Text style={{ color: colors.text }}>-50</Text>
                </TouchableOpacity>
                <Text style={[styles.targetValue, { color: colors.text }]}>
                  {caloriesTarget} kcal
                </Text>
                <TouchableOpacity
                  style={[styles.targetButton, { borderColor: colors.border }]}
                  onPress={() => updateTarget('caloriesTarget', 50)}
                >
                  <Text style={{ color: colors.text }}>+50</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.targetPresetRow}>
              <Text style={[styles.targetPresetLabel, { color: colors.subtext }]}>
                Quick presets
              </Text>
              <View style={styles.targetPresetChips}>
                <TouchableOpacity
                  style={[styles.targetPresetChip, { backgroundColor: chipBg }]}
                  onPress={() => setTargetValue('caloriesTarget', 300)}
                >
                  <Text style={[styles.targetPresetText, { color: chipText }]}>
                    Light (300)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.targetPresetChip, { backgroundColor: chipBg }]}
                  onPress={() => setTargetValue('caloriesTarget', 400)}
                >
                  <Text style={[styles.targetPresetText, { color: chipText }]}>
                    Balanced (400)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.targetPresetChip, { backgroundColor: chipBg }]}
                  onPress={() => setTargetValue('caloriesTarget', 600)}
                >
                  <Text style={[styles.targetPresetText, { color: chipText }]}>
                    High (600)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
      }

      case 'water': {
        const pct = Math.round(waterPct * 100);

        return (
          <View>
            <Text style={[styles.metricModalTitle, { color: colors.text }]}>
              Water Intake
            </Text>
            <Text style={[styles.metricModalSubtitle, { color: colors.subtext }]}>
              You&apos;ve logged {waterStats.glasses} cup(s) towards a goal of{' '}
              {waterStats.target}.
            </Text>

            <View style={styles.detailBarRow}>
              <Text style={[styles.detailBarLabel, { color: colors.subtext }]}>
                Today&apos;s progress
              </Text>
              <Text style={[styles.detailBarValue, { color: colors.text }]}>
                {pct}%
              </Text>
            </View>

            <View style={[styles.detailBarBg, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.detailBarFill,
                  {
                    width: `${Math.min(Math.max(waterPct || 0, 0), 1) * 100}%`,
                    backgroundColor: '#29B6F6',
                  },
                ]}
              />
            </View>

            <Text style={[styles.metricModalSubtitle, { color: colors.subtext, marginTop: 12 }]}>
              Tip: spreading cups evenly across the day keeps you energized.
            </Text>

            <View style={[styles.targetEditRow, { backgroundColor: softCardBg }]}>
              <Text style={[styles.detailBarLabel, { color: colors.subtext }]}>
                Daily target
              </Text>
              <View style={styles.targetEditButtons}>
                <TouchableOpacity
                  style={[styles.targetButton, { borderColor: colors.border }]}
                  onPress={() => updateWaterTarget(-1)}
                >
                  <Text style={{ color: colors.text }}>-</Text>
                </TouchableOpacity>
                <Text style={[styles.targetValue, { color: colors.text }]}>
                  {waterStats.target} cups
                </Text>
                <TouchableOpacity
                  style={[styles.targetButton, { borderColor: colors.border }]}
                  onPress={() => updateWaterTarget(1)}
                >
                  <Text style={{ color: colors.text }}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.targetPresetRow}>
              <Text style={[styles.targetPresetLabel, { color: colors.subtext }]}>
                Quick presets
              </Text>
              <View style={styles.targetPresetChips}>
                <TouchableOpacity
                  style={[styles.targetPresetChip, { backgroundColor: chipBg }]}
                  onPress={() => setWaterTargetValue(6)}
                >
                  <Text style={[styles.targetPresetText, { color: chipText }]}>
                    Light (6)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.targetPresetChip, { backgroundColor: chipBg }]}
                  onPress={() => setWaterTargetValue(8)}
                >
                  <Text style={[styles.targetPresetText, { color: chipText }]}>
                    Standard (8)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.targetPresetChip, { backgroundColor: chipBg }]}
                  onPress={() => setWaterTargetValue(10)}
                >
                  <Text style={[styles.targetPresetText, { color: chipText }]}>
                    High (10)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.waterFullButton, { backgroundColor: '#29B6F6' }]}
              onPress={() => {
                setActiveMetric(null);
                navigation.navigate('WaterTracker');
              }}
            >
              <Ionicons name="water-outline" size={18} color="#fff" />
              <Text style={styles.waterFullButtonText}>
                Open full water tracker
              </Text>
            </TouchableOpacity>
          </View>
        );
      }

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={{ color: colors.text }}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // header gradient theme-friendly
  const headerGrad =
    theme === 'light'
      ? ['#1A6DFF', '#22C1C3']
      : ['#0B1B4D', '#0EA5E9'];

  return (
    // Important: allow header to go behind the notch; we handle safe-area with insets
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={headerGrad}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { paddingTop: insets.top + 14 }]}
      >
        <View style={styles.appBrandRow}>
          <View style={styles.appLogoWrapper}>
            <Image
              source={require('../../assets/logo.jpg')}
              style={styles.appLogo}
              resizeMode="contain"
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.appName}>BeFit</Text>
            <Text style={styles.appTagline}>Simple, gamified daily fitness</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.badgeLevelPill,
              {
                backgroundColor: 'rgba(255,255,255,0.95)',
                borderWidth: 2,
                borderColor: getLevelColor(badgeLevel),
              },
            ]}
            onPress={() => navigation.navigate('Achievements')}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.badgeIconWrapper,
                { backgroundColor: getLevelColor(badgeLevel) },
              ]}
            >
              <MaterialCommunityIcons
                name={getLevelIcon(badgeLevel)}
                size={14}
                color="#FFFFFF"
              />
            </View>
            <Text style={[styles.badgeLevelText, { color: '#1F2937' }]}>
              {badgeLevel}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={14}
              color={getLevelColor(badgeLevel)}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.headerTextRow}>
          <View>
            <Text style={styles.greeting}>
              Hey, {userData?.name || userData?.fullName || 'athlete'} 👋
            </Text>
            <Text style={styles.date}>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </View>
          <View style={styles.streakPill}>
            <Ionicons name="flame" size={16} color="#FFF3CD" />
            <Text style={styles.streakText}>{totalWorkouts || 0} total</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
      >
        <View style={styles.heroSection}>
          <HeroCard />
        </View>

        <QuickActionsSection />

        <View style={[styles.section, { marginTop: 16 }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Recent Workouts
            </Text>
            {recentWorkouts.length > 0 && (
              <TouchableOpacity onPress={() => navigation.navigate('Workout')}>
                <Text style={[styles.seeAllText, { color: colors.accent }]}>
                  See all
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {recentWorkouts.length === 0 ? (
            <View
              style={[
                styles.emptyWorkouts,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.emptyWorkoutsText, { color: colors.subtext }]}>
                No workouts yet. Start your first one today!
              </Text>
              <TouchableOpacity
                style={[styles.startButton, { backgroundColor: colors.accent }]}
                onPress={() => navigation.navigate('Workout')}
              >
                <Text style={styles.startButtonText}>Log workout</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View
              style={[
                styles.recentWorkoutsList,
                { backgroundColor: colors.card },
              ]}
            >
              {recentWorkouts.map((workout) => (
                <RecentWorkoutItem key={workout.id} workout={workout} />
              ))}
            </View>
          )}
        </View>

        <View style={[styles.section, { marginTop: 16, marginBottom: 24 }]}>
          <View style={styles.motivationCard}>
            <View style={styles.motivationOverlay} />
            <Text style={styles.motivationQuote}>
              &quot;The only bad workout is the one that didn&apos;t happen.&quot;
            </Text>
            <Text style={styles.motivationAuthor}>Keep going 💪</Text>
          </View>
        </View>
      </ScrollView>

      {activeMetric && (
        <View style={styles.metricModalOverlay}>
          <View
            style={[
              styles.metricModalCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <TouchableOpacity
              style={styles.metricModalClose}
              onPress={() => setActiveMetric(null)}
            >
              <Ionicons name="close" size={20} color={colors.subtext} />
            </TouchableOpacity>
            <ScrollView
              contentContainerStyle={{ paddingBottom: 8 }}
              showsVerticalScrollIndicator={false}
            >
              {renderMetricDetail()}
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 24 },

  headerGradient: {
    paddingHorizontal: 20,
    paddingBottom: 22,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  appBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  appLogoWrapper: {
    width: 52,
    height: 52,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  appLogo: {
    width: '100%',
    height: '100%',
  },
  appName: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  appTagline: {
    fontSize: 12,
    marginTop: 2,
    color: 'rgba(255,255,255,0.8)',
  },

  badgeLevelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 10,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  badgeIconWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  badgeLevelText: {
    fontSize: 13,
    fontWeight: '700',
    marginRight: 2,
  },

  headerTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: { fontSize: 18, fontWeight: '600', color: 'white' },
  date: { fontSize: 13, marginTop: 2, color: 'rgba(255,255,255,0.9)' },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  streakText: {
    color: '#FFF3CD',
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '600',
  },

  heroSection: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  heroWrapper: {
    borderRadius: 26,
    overflow: 'hidden',
  },
  heroCard: {
    borderRadius: 26,
    padding: 14,
    borderWidth: 1,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  heroSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  heroBadgeLight: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  heroBadgeTextLight: {
    fontSize: 11,
    marginLeft: 6,
    fontWeight: '600',
  },
  heroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  heroTile: {
    width: '48%',
    borderRadius: 18,
    padding: 10,
    marginBottom: 8,
  },
  heroIconBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  heroTileLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  heroTileValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  heroTileUnit: {
    fontSize: 11,
  },
  heroBarBg: {
    height: 7,
    borderRadius: 999,
    marginTop: 8,
    overflow: 'hidden',
  },
  heroBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  heroTileHint: {
    fontSize: 11,
    marginTop: 6,
  },

  sectionFullPage: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  quickCard: {
    borderRadius: 26,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderWidth: 1,
  },
  section: {
    paddingHorizontal: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 20, fontWeight: '700' },
  seeAllText: { fontSize: 14, fontWeight: '600' },

  quickTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  quickSubtitle: {
    fontSize: 13,
    marginTop: 6,
  },

  weeklyChartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 12,
    paddingVertical: 8,
  },
  weeklyChartCol: {
    alignItems: 'center',
    flex: 1,
  },
  weeklyChartBarWrapper: {
    height: 80,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  weeklyChartBar: {
    width: 12,
    borderRadius: 999,
    minHeight: 4,
  },
  weeklyChartLabel: {
    fontSize: 11,
    marginTop: 6,
    fontWeight: '600',
  },

  actionGrid: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  actionButton: {
    width: '48%',
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  actionIconBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionButtonTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtonSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },

  emptyWorkouts: {
    padding: 22,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyWorkoutsText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 14,
  },
  startButton: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
  },
  startButtonText: { color: 'white', fontSize: 14, fontWeight: '600' },

  recentWorkoutsList: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  recentWorkoutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  recentWorkoutInfo: { flex: 1 },
  recentWorkoutName: { fontSize: 15, fontWeight: '600' },
  recentWorkoutDetails: { fontSize: 13 },
  recentWorkoutDate: { fontSize: 11 },

  motivationCard: {
    padding: 18,
    borderRadius: 16,
    backgroundColor: '#5A67D8',
    alignItems: 'center',
    overflow: 'hidden',
  },
  motivationOverlay: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  motivationQuote: {
    color: 'white',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 6,
  },
  motivationAuthor: { color: 'white', fontSize: 13, opacity: 0.9 },

  metricModalOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  metricModalCard: {
    width: '100%',
    maxHeight: '75%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  metricModalClose: {
    alignSelf: 'flex-end',
    padding: 4,
    marginBottom: 8,
  },
  metricModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  metricModalSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6,
    marginBottom: 4,
  },
  detailBarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  detailBarLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailBarValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  detailBarBg: {
    width: '100%',
    height: 12,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 8,
  },
  detailBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  flameRowLarge: {
    flexDirection: 'row',
    marginTop: 20,
    marginBottom: 8,
    justifyContent: 'center',
    gap: 6,
  },

  metricStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  metricStatsItem: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
  },
  metricStatsLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  metricStatsValue: {
    fontSize: 18,
    fontWeight: '700',
  },

  targetEditRow: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  targetEditButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  targetButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetValue: {
    marginHorizontal: 12,
    fontSize: 18,
    fontWeight: '700',
    minWidth: 40,
    textAlign: 'center',
  },

  targetPresetRow: {
    marginTop: 14,
  },
  targetPresetLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  targetPresetChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  targetPresetChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  targetPresetText: {
    fontSize: 11,
  },

  waterFullButton: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 999,
  },
  waterFullButtonText: {
    color: 'white',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default HomeScreen;
