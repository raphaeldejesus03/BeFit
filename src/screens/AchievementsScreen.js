// src/screens/AchievementsScreen.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  RefreshControl,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ConfettiCannon from 'react-native-confetti-cannon';

import { readGamification } from '../gamification/engine';
import AchievementsPanel from '../gamification/AchievementsPanel';
import { auth } from '../services/firebase';

import { useTheme } from './ThemeContext';
import { lightTheme, darkTheme } from './themes';

/**
 * Master list of ALL achievements the app supports.
 * key MUST match the badge key stored in Firestore (engine.js).
 */
const ALL_ACHIEVEMENTS = [
  // Onboarding / meta
  { key: 'QUICK_START', name: 'Quick Start', description: 'Complete an activity shortly after creating your account.', icon: 'rocket-launch-outline', theme: 'special' },
  { key: 'TEST_MASTER', name: 'Badge Collector', description: 'Unlock at least 5 different badges.', icon: 'star-circle-outline', theme: 'special' },

  // Level-based
  { key: 'LEVEL_BRONZE', name: 'Bronze Level', description: 'Reach Bronze level.', icon: 'medal-outline', theme: 'level' },
  { key: 'LEVEL_SILVER', name: 'Silver Level', description: 'Reach Silver level (500+ XP).', icon: 'medal', theme: 'level' },
  { key: 'LEVEL_GOLD', name: 'Gold Level', description: 'Reach Gold level (1500+ XP).', icon: 'crown-outline', theme: 'level' },
  { key: 'LEVEL_PLATINUM', name: 'Platinum Level', description: 'Reach Platinum level (4000+ XP).', icon: 'crown', theme: 'level' },

  // Workouts
  { key: 'FIRST_WORKOUT', name: 'First Rep', description: 'Complete your first workout.', icon: 'dumbbell', theme: 'workout' },
  { key: 'FIVE_WORKOUTS', name: 'Getting Consistent', description: 'Complete 5 workouts in total.', icon: 'run-fast', theme: 'workout' },
  { key: 'TEN_WORKOUTS', name: 'Double Digits', description: 'Complete 10 workouts in total.', icon: 'arm-flex-outline', theme: 'workout' },
  { key: 'TWENTY_WORKOUTS', name: 'Training Habit', description: 'Complete 20 workouts in total.', icon: 'weight-lifter', theme: 'workout' },
  { key: 'FIFTY_WORKOUTS', name: 'Gym Regular', description: 'Complete 50 workouts in total.', icon: 'lightning-bolt-outline', theme: 'workout' },
  { key: 'HUNDRED_WORKOUTS', name: 'BeFit Legend', description: 'Complete 100 workouts in total.', icon: 'trophy-outline', theme: 'workout' },

  // Workout streaks
  { key: 'STREAK_1', name: 'Day One', description: 'Complete a workout today.', icon: 'calendar-check-outline', theme: 'streak' },
  { key: 'STREAK_3', name: '3-Day Streak', description: 'Work out 3 days in a row.', icon: 'fire', theme: 'streak' },
  { key: 'STREAK_7', name: '1-Week Streak', description: 'Work out 7 days in a row.', icon: 'fire-circle', theme: 'streak' },
  { key: 'STREAK_14', name: '2-Week Streak', description: 'Work out 14 days in a row.', icon: 'shield-fire', theme: 'streak' },
  { key: 'STREAK_30', name: '30-Day Streak', description: 'Work out 30 days in a row.', icon: 'crown-circle-outline', theme: 'streak' },

  // Hydration
  { key: 'FIRST_WATER', name: 'First Sip', description: 'Log your first glass of water.', icon: 'cup-water', theme: 'water' },
  { key: 'FIVE_WATER_GOALS', name: 'Hydration Hero', description: 'Hit your water goal on 5 different days.', icon: 'water', theme: 'water' },
  { key: 'THIRTY_WATER_GOALS', name: 'Hydration Master', description: 'Hit your water goal on 30 different days.', icon: 'water-circle', theme: 'water' },
  { key: 'HYDRATION_STREAK_7', name: '7-Day Hydration Streak', description: 'Reach a 7-day water streak.', icon: 'weather-rainy', theme: 'water' },

  // Nutrition
  { key: 'FIRST_MEAL', name: 'Mindful Meal', description: 'Log your first meal.', icon: 'food-apple-outline', theme: 'nutrition' },
  { key: 'FIVE_MEAL_DAYS', name: 'Balanced Week', description: 'Log meals on 10 different days.', icon: 'food', theme: 'nutrition' },
  { key: 'TWENTY_MEAL_DAYS', name: 'Meal Planner', description: 'Log meals on 30 different days.', icon: 'food-steak', theme: 'nutrition' },

  // AI Coach
  { key: 'AI_FIRST_CHAT', name: 'Met the Coach', description: 'Use the AI coach for the first time.', icon: 'robot-outline', theme: 'ai' },
  { key: 'AI_TEN_CHATS', name: 'AI Power User', description: 'Have 10 conversations with the AI coach.', icon: 'robot-happy-outline', theme: 'ai' },
];

const FILTERS = [
  { key: 'all', label: 'All', icon: 'apps' },
  { key: 'workout', label: 'Workout', icon: 'dumbbell' },
  { key: 'streak', label: 'Streaks', icon: 'fire' },
  { key: 'water', label: 'Water', icon: 'water' },
  { key: 'nutrition', label: 'Nutrition', icon: 'food-apple' },
  { key: 'ai', label: 'AI', icon: 'robot' },
  { key: 'level', label: 'Levels', icon: 'crown' },
];

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const getXPPercent = (xp) => clamp(Math.round((Math.max(0, xp || 0) / 4000) * 100), 0, 100);

function getThemeColor(theme, colors) {
  switch (theme) {
    case 'workout':
      return '#F97316';
    case 'streak':
      return '#F59E0B';
    case 'water':
      return '#3B82F6';
    case 'nutrition':
      return '#22C55E';
    case 'ai':
      return '#A855F7';
    case 'level':
      return '#EAB308';
    case 'special':
      return colors.accent;
    default:
      return colors.accent;
  }
}
const getThemeBg = (t, colors) => getThemeColor(t, colors) + '18';

const AchievementsScreen = () => {
  const { theme } = useTheme();
  const colors = theme === 'light' ? lightTheme : darkTheme;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [gamification, setGamification] = useState(null);
  const [showAllModal, setShowAllModal] = useState(false);

  const [showConfetti, setShowConfetti] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  const fetchGamification = async () => {
    const user = auth.currentUser;
    if (!user) {
      setGamification(null);
      return;
    }

    const data = await readGamification(user.uid);
    setGamification(data);

    const unlocked = Object.keys(data.badges || {}).filter((k) => data.badges[k]);
    if (unlocked.length > 0) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2600);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        await fetchGamification();
      } catch (err) {
        console.error('Error loading gamification', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchGamification();
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  const xp = gamification?.xp || 0;
  const levelName = gamification?.levelName || 'Bronze';
  const streaks = gamification?.streaks || {};
  const badges = gamification?.badges || {};

  const unlockedKeys = useMemo(() => Object.keys(badges).filter((k) => badges[k]), [badges]);
  const unlockedSet = useMemo(() => new Set(unlockedKeys), [unlockedKeys]);

  const unlockedAchievementsAll = useMemo(
    () => ALL_ACHIEVEMENTS.filter((a) => unlockedSet.has(a.key)),
    [unlockedSet]
  );

  const filteredUnlockedAchievements = useMemo(() => {
    if (activeFilter === 'all') return unlockedAchievementsAll;
    return unlockedAchievementsAll.filter((a) => a.theme === activeFilter);
  }, [activeFilter, unlockedAchievementsAll]);

  const unlockedCount = unlockedAchievementsAll.length;
  const totalCount = ALL_ACHIEVEMENTS.length;
  const xpPercent = getXPPercent(xp);

  const Header = () => (
    <LinearGradient
      colors={['#6D28D9', '#2563EB', '#F59E0B']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.header}
    >
      <SafeAreaView>
        <View style={styles.headerContent}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerTitleWrap}>
              <View style={styles.headerIconBubble}>
                <MaterialCommunityIcons name="trophy-outline" size={18} color="#fff" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Achievements</Text>
                <Text style={styles.headerSubtitle}>Levels • XP • Streaks • Badges</Text>
              </View>
            </View>
          </View>

          <View style={styles.heroRow}>
            <View style={styles.heroLeft}>
              <Text style={styles.heroLabel}>Current level</Text>
              <Text style={styles.heroValue}>{levelName}</Text>
            </View>

            <View style={styles.heroRight}>
              <View style={styles.heroChip}>
                <MaterialCommunityIcons name="star-four-points" size={14} color="#111827" />
                <Text style={styles.heroChipText}>{xp} XP</Text>
              </View>
              <View style={[styles.heroChip, { marginTop: 8 }]}>
                <MaterialCommunityIcons name="trophy" size={14} color="#111827" />
                <Text style={styles.heroChipText}>
                  {unlockedCount}/{totalCount}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.heroBarWrap}>
            <View style={styles.heroBarTrack}>
              <View style={[styles.heroBarFill, { width: `${xpPercent}%` }]} />
            </View>
            <Text style={styles.heroBarText}>{xpPercent}% to Platinum (4000 XP)</Text>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );

  const FilterChips = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
      {FILTERS.map((f) => {
        const active = activeFilter === f.key;
        const chipBg = active
          ? (theme === 'light' ? '#111827' : '#F9FAFB')
          : (theme === 'light' ? '#FFFFFF' : '#111827');
        const chipBorder = active ? 'transparent' : colors.border;
        const chipText = active ? (theme === 'light' ? '#fff' : '#111827') : colors.text;
        const chipSub = active ? (theme === 'light' ? 'rgba(255,255,255,0.85)' : '#374151') : colors.subtext;

        const unlockedCountForChip =
          f.key === 'all'
            ? unlockedAchievementsAll.length
            : unlockedAchievementsAll.filter((a) => a.theme === f.key).length;

        return (
          <TouchableOpacity
            key={f.key}
            activeOpacity={0.85}
            onPress={() => setActiveFilter(f.key)}
            style={[styles.chip, { backgroundColor: chipBg, borderColor: chipBorder }]}
          >
            <MaterialCommunityIcons
              name={f.icon}
              size={16}
              color={active ? chipText : colors.subtext}
              style={{ marginRight: 6 }}
            />
            <View>
              <Text style={[styles.chipText, { color: chipText }]}>{f.label}</Text>
              <Text style={[styles.chipSub, { color: chipSub }]}>{unlockedCountForChip} unlocked</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const AchievementCard = ({ a }) => {
    const accent = getThemeColor(a.theme, colors);
    const bg = getThemeBg(a.theme, colors);

    return (
      <View style={[styles.achievementCard, { backgroundColor: bg, borderColor: accent + '55' }]}>
        <View style={[styles.achievementAccent, { backgroundColor: accent }]} />
        <View style={styles.achievementBody}>
          <View style={styles.achievementTopRow}>
            <View style={[styles.achievementIconBubble, { backgroundColor: accent + '22' }]}>
              <MaterialCommunityIcons name={a.icon} size={22} color={accent} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.achievementTitle, { color: colors.text }]}>{a.name}</Text>
              <Text style={[styles.achievementDesc, { color: colors.subtext }]}>{a.description}</Text>
            </View>

            <View style={[styles.statusPill, { backgroundColor: accent }]}>
              <Text style={[styles.statusPillText, { color: '#111827' }]}>Unlocked</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const AllModal = () => (
    <Modal visible={showAllModal} transparent animationType="slide" onRequestClose={() => setShowAllModal(false)}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.modalIconBubble, { backgroundColor: colors.accent + '22' }]}>
                <MaterialCommunityIcons name="trophy-outline" size={18} color={colors.accent} />
              </View>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>All Achievements</Text>
                <Text style={[styles.modalSubtitle, { color: colors.subtext }]}>
                  {unlockedCount} unlocked • {totalCount - unlockedCount} locked
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={() => setShowAllModal(false)} activeOpacity={0.85}>
              <MaterialCommunityIcons name="close" size={22} color={colors.subtext} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: '82%' }} contentContainerStyle={{ paddingBottom: 18 }} showsVerticalScrollIndicator={false}>
            {ALL_ACHIEVEMENTS.map((a) => {
              const isUnlocked = unlockedSet.has(a.key);
              const accent = getThemeColor(a.theme, colors);
              const bg = isUnlocked ? getThemeBg(a.theme, colors) : (theme === 'light' ? '#FFFFFF' : '#111827');

              return (
                <View key={a.key} style={{ marginBottom: 10 }}>
                  <View
                    style={[
                      styles.achievementCard,
                      {
                        backgroundColor: bg,
                        borderColor: isUnlocked ? accent + '55' : colors.border,
                        opacity: isUnlocked ? 1 : 0.75,
                      },
                    ]}
                  >
                    <View style={[styles.achievementAccent, { backgroundColor: isUnlocked ? accent : colors.border }]} />
                    <View style={styles.achievementBody}>
                      <View style={styles.achievementTopRow}>
                        <View style={[styles.achievementIconBubble, { backgroundColor: accent + (isUnlocked ? '22' : '10') }]}>
                          <MaterialCommunityIcons name={a.icon} size={22} color={isUnlocked ? accent : colors.subtext} />
                          {!isUnlocked && (
                            <View style={styles.lockDot}>
                              <MaterialCommunityIcons name="lock-outline" size={12} color={colors.subtext} />
                            </View>
                          )}
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={[styles.achievementTitle, { color: isUnlocked ? colors.text : colors.subtext }]}>
                            {a.name}
                          </Text>
                          <Text style={[styles.achievementDesc, { color: colors.subtext }]}>{a.description}</Text>
                        </View>

                        <View
                          style={[
                            styles.statusPill,
                            {
                              backgroundColor: isUnlocked ? accent : (theme === 'light' ? '#E5E7EB' : '#0B1220'),
                              borderColor: isUnlocked ? 'transparent' : colors.border,
                            },
                          ]}
                        >
                          <Text style={[styles.statusPillText, { color: isUnlocked ? '#111827' : colors.subtext }]}>
                            {isUnlocked ? 'Unlocked' : 'Locked'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.subtext }]}>Loading achievements...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {showConfetti && (
        <View pointerEvents="none" style={styles.confettiOverlay}>
          <ConfettiCannon count={120} origin={{ x: 0, y: 0 }} fadeOut />
        </View>
      )}

      <Header />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6D28D9" colors={['#6D28D9']} />
        }
      >
        <View style={styles.section}>
          <FilterChips />
        </View>

        <View style={styles.section}>
          <AchievementsPanel levelName={levelName} xp={xp} streaks={streaks} badges={badges} colors={colors} />
        </View>

        {/* UNLOCKED ONLY list */}
        <View style={styles.section}>
          <View style={styles.listHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {activeFilter === 'all'
                ? 'Unlocked badges'
                : `Unlocked ${FILTERS.find((f) => f.key === activeFilter)?.label} badges`}
            </Text>
            <View style={[styles.countBadge, { backgroundColor: colors.accent + '20' }]}>
              <Text style={[styles.countText, { color: colors.accent }]}>{filteredUnlockedAchievements.length}</Text>
            </View>
          </View>

          {filteredUnlockedAchievements.length === 0 ? (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.emptyMini}>
                <Text style={[styles.emptyMiniEmoji, { color: colors.subtext }]}>🔒</Text>
                <Text style={[styles.emptyMiniText, { color: colors.subtext }]}>
                  No unlocked badges in this category yet. Tap “View all achievements & badges” to see what to unlock next.
                </Text>
              </View>
            </View>
          ) : (
            filteredUnlockedAchievements.map((a) => <AchievementCard key={a.key} a={a} />)
          )}
        </View>

        {/* CTA */}
        <View style={styles.section}>
          <TouchableOpacity style={[styles.primaryBtnWrap, { borderColor: colors.border }]} activeOpacity={0.9} onPress={() => setShowAllModal(true)}>
            <LinearGradient colors={['#6D28D9', '#2563EB']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtn}>
              <MaterialCommunityIcons name="trophy-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.primaryBtnText}>View all achievements & badges</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <AllModal />
    </View>
  );
};

export default AchievementsScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },

  confettiOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999,
  },

  header: {
    paddingTop: Platform.OS === 'android' ? 40 : 0,
    paddingBottom: 18,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: { paddingTop: 10 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitleWrap: { flexDirection: 'row', alignItems: 'center' },
  headerIconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#fff' },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.88)', marginTop: 2 },

  heroRow: { marginTop: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroLeft: { flex: 1 },
  heroLabel: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '700' },
  heroValue: { fontSize: 22, color: '#fff', fontWeight: '900', marginTop: 2 },
  heroRight: { alignItems: 'flex-end' },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  heroChipText: { fontSize: 12, fontWeight: '800', color: '#111827' },

  heroBarWrap: { marginTop: 12 },
  heroBarTrack: { width: '100%', height: 10, borderRadius: 999, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.28)' },
  heroBarFill: { height: '100%', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.9)' },
  heroBarText: { marginTop: 6, fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '700' },

  content: { flex: 1 },
  contentContainer: { paddingBottom: 24 },
  section: { paddingHorizontal: 20, marginTop: 12 },

  chipsRow: { paddingRight: 20 },
  chip: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 12, marginRight: 10 },
  chipText: { fontSize: 13, fontWeight: '800' },
  chipSub: { fontSize: 11, fontWeight: '700', marginTop: 2 },

  card: { borderRadius: 26, paddingHorizontal: 18, paddingVertical: 16, borderWidth: 1 },

  emptyMini: { paddingVertical: 6, alignItems: 'center' },
  emptyMiniEmoji: { fontSize: 28, marginBottom: 6 },
  emptyMiniText: { fontSize: 13, textAlign: 'center', fontWeight: '600' },

  listHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '900' },
  countBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  countText: { fontSize: 12, fontWeight: '900' },

  achievementCard: { borderRadius: 22, borderWidth: 1, marginBottom: 10, overflow: 'hidden', flexDirection: 'row' },
  achievementAccent: { width: 6 },
  achievementBody: { flex: 1, padding: 14 },
  achievementTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  achievementIconBubble: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  lockDot: { position: 'absolute', right: -6, bottom: -6, backgroundColor: 'rgba(0,0,0,0.08)', padding: 4, borderRadius: 999 },
  achievementTitle: { fontSize: 15, fontWeight: '900' },
  achievementDesc: { marginTop: 4, fontSize: 12, fontWeight: '600' },

  statusPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  statusPillText: { fontSize: 11, fontWeight: '900' },

  primaryBtnWrap: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  primaryBtn: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '900' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard: { margin: 12, borderRadius: 24, borderWidth: 1, padding: 16, maxHeight: '86%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalIconBubble: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  modalTitle: { fontSize: 18, fontWeight: '900' },
  modalSubtitle: { fontSize: 12, fontWeight: '700', marginTop: 2 },

  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 10, fontSize: 14, fontWeight: '700' },

  bottomSpacer: { height: 18 },
});
