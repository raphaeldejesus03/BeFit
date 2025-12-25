// src/screens/ProgressScreen.js
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { useTheme } from './ThemeContext';
import { lightTheme, darkTheme } from './themes';

const { width: screenWidth } = Dimensions.get('window');

/** ✅ Progress / Growth theme */
const PROGRESS_GRADIENT = ['#16A34A', '#14B8A6', '#22D3EE']; // emerald -> teal -> cyan
const PROGRESS_ACCENT = '#16A34A';
const PROGRESS_DARK_TEXT = '#065F46';

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const safeNum = (n) => (Number.isFinite(n) ? n : 0);

const ProgressScreen = () => {
  const { theme } = useTheme();
  const colors = theme === 'light' ? lightTheme : darkTheme;

  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState({
    totalWorkouts: 0,
    totalDuration: 0,
    averageDuration: 0,
    mostFrequentType: '',
    thisWeekWorkouts: 0,
    lastWeekWorkouts: 0,
    workoutsByType: {},
    weeklyProgress: [],
    dailyAverage: [],
  });

  useEffect(() => {
    fetchProgressData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProgressData();
    setRefreshing(false);
  };

  const fetchProgressData = async () => {
    try {
      setLoading(true);

      const user = auth.currentUser;
      if (!user?.uid) {
        setWorkouts([]);
        setStats({
          totalWorkouts: 0,
          totalDuration: 0,
          averageDuration: 0,
          mostFrequentType: '',
          thisWeekWorkouts: 0,
          lastWeekWorkouts: 0,
          workoutsByType: {},
          weeklyProgress: [],
          dailyAverage: [],
        });
        return;
      }

      const workoutsQuery = query(
        collection(db, 'workouts'),
        where('userId', '==', user.uid)
      );

      const querySnapshot = await getDocs(workoutsQuery);

      const workoutList = querySnapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      workoutList.sort((a, b) => {
        try {
          const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || Date.now());
          const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || Date.now());
          return dateB - dateA;
        } catch (error) {
          console.warn('Error sorting workout dates:', error);
          return 0;
        }
      });

      setWorkouts(workoutList);
      calculateStats(workoutList);
    } catch (error) {
      console.error('Error fetching progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (workoutList) => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const totalWorkouts = workoutList.length;
    const totalDuration = workoutList.reduce((sum, w) => sum + (w.duration || 0), 0);
    const averageDuration = totalWorkouts > 0 ? Math.round(totalDuration / totalWorkouts) : 0;

    const thisWeekWorkouts = workoutList.filter((w) => {
      try {
        const date = w.createdAt?.toDate?.() || new Date(w.createdAt || Date.now());
        return date >= oneWeekAgo;
      } catch {
        return false;
      }
    }).length;

    const lastWeekWorkouts = workoutList.filter((w) => {
      try {
        const date = w.createdAt?.toDate?.() || new Date(w.createdAt || Date.now());
        return date >= twoWeeksAgo && date < oneWeekAgo;
      } catch {
        return false;
      }
    }).length;

    const workoutsByType = workoutList.reduce((acc, workout) => {
      const type = workout.type || 'general';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const mostFrequentType =
      Object.keys(workoutsByType).length > 0
        ? Object.keys(workoutsByType).reduce(
            (a, b) => (workoutsByType[a] > workoutsByType[b] ? a : b),
            'general'
          )
        : 'none';

    // Weekly progress (last 8 weeks)
    const weeklyProgress = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

      const weekWorkouts = workoutList.filter((w) => {
        try {
          const date = w.createdAt?.toDate?.() || new Date(w.createdAt || Date.now());
          return date >= weekStart && date < weekEnd;
        } catch {
          return false;
        }
      });

      weeklyProgress.push({
        week: `W${8 - i}`,
        workouts: weekWorkouts.length,
        duration: weekWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0),
      });
    }

    // Daily average for current week
    const dailyAverage = [];
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    days.forEach((day, index) => {
      const dayWorkouts = workoutList.filter((w) => {
        try {
          const date = w.createdAt?.toDate?.() || new Date(w.createdAt || Date.now());
          const dayOfWeek = date.getDay();
          const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          return adjustedDay === index && date >= oneWeekAgo;
        } catch {
          return false;
        }
      });

      dailyAverage.push({
        day,
        count: dayWorkouts.length,
      });
    });

    setStats({
      totalWorkouts,
      totalDuration,
      averageDuration,
      mostFrequentType,
      thisWeekWorkouts,
      lastWeekWorkouts,
      workoutsByType,
      weeklyProgress,
      dailyAverage,
    });
  };

  const weeklyTrend = stats.thisWeekWorkouts - stats.lastWeekWorkouts;

  const totalHours = useMemo(() => {
    const hrs = safeNum(stats.totalDuration) / 60;
    return Math.round(hrs * 10) / 10;
  }, [stats.totalDuration]);

  const favoritePretty = useMemo(() => {
    if (!stats.mostFrequentType || stats.mostFrequentType === 'none') return '';
    const t = stats.mostFrequentType;
    return t.charAt(0).toUpperCase() + t.slice(1);
  }, [stats.mostFrequentType]);

  // ---------- UI Components ----------
  const Card = ({ children, style }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, style]}>
      {children}
    </View>
  );

  const StatTile = ({ icon, title, value, subtitle, accent, trend }) => {
    const a = accent || PROGRESS_ACCENT;
    const trendColor = trend > 0 ? '#16A34A' : trend < 0 ? '#EF4444' : colors.subtext;
    const trendIcon = trend > 0 ? 'trending-up' : trend < 0 ? 'trending-down' : 'minus';

    return (
      <View
        style={[
          styles.statTile,
          {
            backgroundColor: theme === 'light' ? '#FFFFFF' : '#0B1120',
            borderColor: colors.border,
          },
        ]}
      >
        <View style={[styles.statIconBubble, { backgroundColor: a + '18' }]}>
          <Ionicons name={icon} size={18} color={a} />
        </View>

        <Text style={[styles.statTitle, { color: colors.subtext }]}>{title}</Text>
        <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>

        {!!subtitle && <Text style={[styles.statSubtitle, { color: colors.subtext }]}>{subtitle}</Text>}

        {typeof trend === 'number' && (
          <View style={styles.trendRow}>
            <MaterialCommunityIcons name={trendIcon} size={16} color={trendColor} />
            <Text style={[styles.trendText, { color: trendColor }]}>{Math.abs(trend)} vs last week</Text>
          </View>
        )}
      </View>
    );
  };

  const MiniBarChart = ({ data, title, keyLabel, keyValue, emptyText }) => {
    const maxValue = Math.max(1, ...data.map((d) => safeNum(d?.[keyValue])));

    return (
      <Card>
        <View style={styles.cardHeaderRow}>
          <View style={[styles.cardHeaderIcon, { backgroundColor: PROGRESS_ACCENT + '18' }]}>
            <Ionicons name="analytics-outline" size={16} color={PROGRESS_ACCENT} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.cardSubtitle, { color: colors.subtext }]}>Last 7–8 periods snapshot</Text>
          </View>
        </View>

        {data.length === 0 ? (
          <View style={styles.emptyBlock}>
            <Text style={[styles.emptyEmoji, { color: colors.subtext }]}>📉</Text>
            <Text style={[styles.emptyText, { color: colors.subtext }]}>{emptyText}</Text>
          </View>
        ) : (
          <View style={styles.barsRow}>
            {data.map((item, idx) => {
              const label = item?.[keyLabel] ?? '';
              const val = safeNum(item?.[keyValue]);
              const heightPct = clamp((val / maxValue) * 100, 0, 100);

              return (
                <View key={`${label}-${idx}`} style={styles.barCol}>
                  <View
                    style={[
                      styles.barTrack,
                      { backgroundColor: theme === 'light' ? '#ECFDF5' : '#111827' },
                    ]}
                  >
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${heightPct}%`,
                          backgroundColor:
                            val > 0
                              ? PROGRESS_ACCENT
                              : theme === 'light'
                              ? '#E5E7EB'
                              : '#1F2937',
                        },
                      ]}
                    />
                  </View>

                  <Text style={[styles.barLabel, { color: colors.subtext }]}>{label}</Text>
                  <Text style={[styles.barValue, { color: colors.text }]}>{val}</Text>
                </View>
              );
            })}
          </View>
        )}
      </Card>
    );
  };

  // ---------- Loading ----------
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header background reaches TOP now */}
        <LinearGradient
          colors={PROGRESS_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          {/* SafeArea ONLY inside the header */}
          <SafeAreaView>
            <View style={styles.headerTop}>
              <View style={styles.headerIconWrap}>
                <Ionicons name="trending-up-outline" size={18} color="#fff" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Progress</Text>
                <Text style={styles.headerSubtitle}>Growth • consistency • momentum</Text>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={PROGRESS_ACCENT} />
          <Text style={[styles.loadingText, { color: colors.subtext }]}>Loading progress…</Text>
        </View>
      </View>
    );
  }

  // ---------- Main ----------
  const hasData = stats.totalWorkouts > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header background reaches TOP now */}
      <LinearGradient
        colors={PROGRESS_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        {/* SafeArea ONLY inside the header */}
        <SafeAreaView>
          <View style={styles.headerTop}>
            <View style={styles.headerIconWrap}>
              <Ionicons name="trending-up-outline" size={18} color="#fff" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Progress</Text>
              <Text style={styles.headerSubtitle}>Growth • consistency • momentum</Text>
            </View>

            <TouchableOpacity activeOpacity={0.9} style={styles.headerChip} onPress={onRefresh}>
              <Ionicons name="refresh" size={14} color="#fff" />
              <Text style={styles.headerChipText}>Refresh</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.headerSummaryRow}>
            <View style={styles.summaryPill}>
              <Ionicons name="barbell-outline" size={14} color={PROGRESS_DARK_TEXT} />
              <Text style={styles.summaryPillText}>{stats.thisWeekWorkouts} this week</Text>
            </View>
            <View style={styles.summaryPill}>
              <Ionicons name="time-outline" size={14} color={PROGRESS_DARK_TEXT} />
              <Text style={styles.summaryPillText}>{totalHours} hrs total</Text>
            </View>
            <View style={styles.summaryPill}>
              <Ionicons name="leaf-outline" size={14} color={PROGRESS_DARK_TEXT} />
              <Text style={styles.summaryPillText}>Momentum</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PROGRESS_ACCENT} />
        }
      >
        <View style={styles.section}>
          <View style={styles.statsGrid}>
            <StatTile
              icon="barbell-outline"
              title="Total Workouts"
              value={stats.totalWorkouts}
              subtitle="all time"
              accent={PROGRESS_ACCENT}
            />
            <StatTile
              icon="calendar-outline"
              title="This Week"
              value={stats.thisWeekWorkouts}
              subtitle="workouts"
              accent="#14B8A6"
              trend={weeklyTrend}
            />
            <StatTile
              icon="time-outline"
              title="Total Hours"
              value={totalHours}
              subtitle="exercised"
              accent="#22D3EE"
            />
            <StatTile
              icon="stopwatch-outline"
              title="Avg Duration"
              value={stats.averageDuration}
              subtitle="minutes"
              accent="#86EFAC"
            />
          </View>
        </View>

        {favoritePretty ? (
          <View style={styles.section}>
            <Card>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.cardHeaderIcon, { backgroundColor: '#34D399' + '18' }]}>
                  <Ionicons name="star-outline" size={16} color="#34D399" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Favorite workout</Text>
                  <Text style={[styles.cardSubtitle, { color: colors.subtext }]}>
                    Your most frequent type so far
                  </Text>
                </View>
              </View>

              <View style={styles.favoriteRow}>
                <View
                  style={[
                    styles.favoriteBadge,
                    { backgroundColor: PROGRESS_ACCENT + '18', borderColor: PROGRESS_ACCENT + '35' },
                  ]}
                >
                  <Text style={[styles.favoriteBadgeText, { color: PROGRESS_ACCENT }]}>
                    {favoritePretty}
                  </Text>
                </View>

                <View style={{ marginLeft: 'auto', alignItems: 'flex-end' }}>
                  <Text style={[styles.favoriteCount, { color: colors.text }]}>
                    {stats.workoutsByType[stats.mostFrequentType]} sessions
                  </Text>
                  <Text style={[styles.favoriteHint, { color: colors.subtext }]}>
                    Keep building the streak 🌿
                  </Text>
                </View>
              </View>
            </Card>
          </View>
        ) : null}

        <View style={styles.section}>
          {hasData ? (
            <>
              <MiniBarChart
                data={stats.weeklyProgress}
                title="Weekly workout frequency"
                keyLabel="week"
                keyValue="workouts"
                emptyText="No weekly data yet."
              />
              <View style={{ height: 12 }} />
              <MiniBarChart
                data={stats.dailyAverage}
                title="This week’s daily activity"
                keyLabel="day"
                keyValue="count"
                emptyText="No daily data yet."
              />
            </>
          ) : (
            <Card>
              <View style={styles.emptyBlock}>
                <Text style={[styles.emptyEmoji, { color: colors.subtext }]}>📊</Text>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No progress data yet</Text>
                <Text style={[styles.emptyText, { color: colors.subtext }]}>
                  Complete a few workouts to see charts and statistics here.
                </Text>
              </View>
            </Card>
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
};

export default ProgressScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },

  headerGradient: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 14 : 8,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  headerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#fff' },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.88)',
  },

  headerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  headerChipText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  headerSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 14,
  },
  summaryPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  summaryPillText: { fontSize: 12, fontWeight: '900', color: PROGRESS_DARK_TEXT },

  scroll: { paddingBottom: 26 },
  section: { paddingHorizontal: 20, marginTop: 12 },

  card: {
    borderRadius: 26,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderWidth: 1,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  statTile: {
    width: (screenWidth - 40 - 12) / 2,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
  },
  statIconBubble: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statTitle: { fontSize: 12, fontWeight: '800' },
  statValue: { fontSize: 22, fontWeight: '900', marginTop: 4 },
  statSubtitle: { fontSize: 12, fontWeight: '700', marginTop: 2 },

  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  trendText: { fontSize: 12, fontWeight: '800' },

  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  cardHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 18, fontWeight: '900' },
  cardSubtitle: { fontSize: 12, fontWeight: '700', marginTop: 2 },

  favoriteRow: { flexDirection: 'row', alignItems: 'center' },
  favoriteBadge: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  favoriteBadgeText: { fontSize: 13, fontWeight: '900' },
  favoriteCount: { fontSize: 14, fontWeight: '900' },
  favoriteHint: { marginTop: 3, fontSize: 12, fontWeight: '700' },

  barsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    paddingTop: 6,
  },
  barCol: { flex: 1, alignItems: 'center' },
  barTrack: {
    width: 20,
    height: 100,
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  barFill: { width: '100%', borderRadius: 6, minHeight: 2 },
  barLabel: { fontSize: 11, fontWeight: '800', marginBottom: 2 },
  barValue: { fontSize: 11, fontWeight: '900' },

  emptyBlock: { alignItems: 'center', paddingVertical: 10 },
  emptyEmoji: { fontSize: 42, marginBottom: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '900', marginBottom: 6 },
  emptyText: { fontSize: 13, fontWeight: '700', textAlign: 'center', lineHeight: 18 },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 10, fontSize: 14, fontWeight: '800' },
});
