// src/screens/WaterTrackerScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  RefreshControl,
  Platform,
  UIManager,
  LayoutAnimation,
} from 'react-native';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import { lightTheme, darkTheme } from './themes';

const { width: screenWidth } = Dimensions.get('window');

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Generate initial placeholder week data
const getInitialWeekData = () => {
  const today = new Date();
  const data = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(today.getDate() - (6 - i));
    data.push({
      date: date.toISOString().split('T')[0],
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0),
      fullDayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      glasses: 0,
      isToday: i === 6,
    });
  }
  return data;
};

const WaterTrackerScreen = ({ navigation }) => {
  const [todayWater, setTodayWater] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(8);
  const [weeklyHistory, setWeeklyHistory] = useState(getInitialWeekData());
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { theme } = useTheme();
  const colors = theme === 'light' ? lightTheme : darkTheme;

  useEffect(() => {
    fetchWaterData();
  }, []);

  const fetchWaterData = async () => {
    try {
      await Promise.all([fetchTodayWater(), fetchWeeklyHistory()]);
    } catch (error) {
      console.error('Error fetching water data:', error);
    } finally {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setInitialLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchWaterData();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setRefreshing(false);
  }, []);

  const fetchTodayWater = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const waterDoc = await getDoc(doc(db, 'water_intake', `${auth.currentUser.uid}_${today}`));
      
      if (waterDoc.exists()) {
        setTodayWater(waterDoc.data().glasses || 0);
        if (waterDoc.data().dailyGoal) {
          setDailyGoal(waterDoc.data().dailyGoal);
        }
      } else {
        setTodayWater(0);
      }
    } catch (error) {
      console.error('Error fetching today water:', error);
    }
  };

  const fetchWeeklyHistory = async () => {
    try {
      const today = new Date();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(today.getDate() - 6);

      const startDate = sevenDaysAgo.toISOString().split('T')[0];
      const endDate = today.toISOString().split('T')[0];

      const dateMap = new Map();
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(today.getDate() - (6 - i));
        const dateString = date.toISOString().split('T')[0];
        dateMap.set(dateString, {
          date: dateString,
          dayName: date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0),
          fullDayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
          glasses: 0,
          isToday: dateString === today.toISOString().split('T')[0],
        });
      }

      const q = query(
        collection(db, 'water_intake'),
        where('userId', '==', auth.currentUser.uid),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      );
      const querySnapshot = await getDocs(q);

      querySnapshot.forEach(doc => {
        const data = doc.data();
        if (dateMap.has(data.date)) {
          dateMap.get(data.date).glasses = data.glasses;
        }
      });

      const history = Array.from(dateMap.values());
      setWeeklyHistory(history);
    } catch (error) {
      console.error('Error fetching weekly history:', error);
    }
  };

  const addWaterGlass = async () => {
    const newGlassCount = todayWater + 1;
    
    // Animate the layout change
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    // Update state immediately (optimistic update)
    setTodayWater(newGlassCount);
    setWeeklyHistory(prev => 
      prev.map(day => 
        day.isToday ? { ...day, glasses: newGlassCount } : day
      )
    );
    
    // Show alert for goal achievement
    if (newGlassCount >= dailyGoal && todayWater < dailyGoal) {
      Alert.alert(
        '🎉 Goal Achieved!',
        `Awesome! You've reached your daily water goal of ${dailyGoal} glasses!`,
        [{ text: 'Keep Going!', style: 'default' }]
      );
    }
    
    // Then persist to Firebase in background
    try {
      const today = new Date().toISOString().split('T')[0];
      const waterDocRef = doc(db, 'water_intake', `${auth.currentUser.uid}_${today}`);
      
      await setDoc(waterDocRef, {
        userId: auth.currentUser.uid,
        date: today,
        glasses: newGlassCount,
        dailyGoal: dailyGoal,
        updatedAt: new Date()
      }, { merge: true });
    } catch (error) {
      // Revert on error
      console.error('Error adding water glass:', error);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setTodayWater(todayWater);
      setWeeklyHistory(prev => 
        prev.map(day => 
          day.isToday ? { ...day, glasses: todayWater } : day
        )
      );
      Alert.alert('Error', 'Failed to add water glass. Please try again.');
    }
  };

  const removeWaterGlass = async () => {
    if (todayWater <= 0) return;
    
    const newGlassCount = todayWater - 1;
    const previousCount = todayWater;
    
    // Animate the layout change
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    // Update state immediately (optimistic update)
    setTodayWater(newGlassCount);
    setWeeklyHistory(prev => 
      prev.map(day => 
        day.isToday ? { ...day, glasses: newGlassCount } : day
      )
    );
    
    // Then persist to Firebase in background
    try {
      const today = new Date().toISOString().split('T')[0];
      const waterDocRef = doc(db, 'water_intake', `${auth.currentUser.uid}_${today}`);
      
      await setDoc(waterDocRef, {
        userId: auth.currentUser.uid,
        date: today,
        glasses: newGlassCount,
        dailyGoal: dailyGoal,
        updatedAt: new Date()
      }, { merge: true });
    } catch (error) {
      // Revert on error
      console.error('Error removing water glass:', error);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setTodayWater(previousCount);
      setWeeklyHistory(prev => 
        prev.map(day => 
          day.isToday ? { ...day, glasses: previousCount } : day
        )
      );
      Alert.alert('Error', 'Failed to remove water glass. Please try again.');
    }
  };

  const updateDailyGoal = async (delta) => {
    const newGoal = Math.max(1, dailyGoal + delta);
    const previousGoal = dailyGoal;
    
    // Update state immediately
    setDailyGoal(newGoal);
    
    // Persist in background
    try {
      const today = new Date().toISOString().split('T')[0];
      const waterDocRef = doc(db, 'water_intake', `${auth.currentUser.uid}_${today}`);
      await setDoc(waterDocRef, {
        userId: auth.currentUser.uid,
        dailyGoal: newGoal,
        updatedAt: new Date()
      }, { merge: true });
    } catch (error) {
      console.error('Error updating daily goal:', error);
      setDailyGoal(previousGoal);
    }
  };

  const getProgressPercentage = () => {
    return Math.min(Math.round((todayWater / dailyGoal) * 100), 100);
  };

  const weeklyTotal = weeklyHistory.reduce((sum, day) => sum + day.glasses, 0);
  const weeklyAverage = weeklyHistory.length > 0 
    ? Math.round(weeklyTotal / weeklyHistory.length * 10) / 10 
    : 0;
  const daysGoalMet = weeklyHistory.filter(day => day.glasses >= dailyGoal).length;

  // Calculate streak
  const getCurrentStreak = () => {
    let streak = 0;
    for (let i = weeklyHistory.length - 1; i >= 0; i--) {
      if (weeklyHistory[i].glasses >= dailyGoal) {
        streak++;
      } else if (!weeklyHistory[i].isToday) {
        break;
      }
    }
    return streak;
  };

  const waterPct = Math.min(todayWater / Math.max(dailyGoal, 1), 1);

  // Header Component
  const Header = () => (
    <LinearGradient
      colors={['#0EA5E9', '#0284C7', '#0369A1']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.header}
    >
      <SafeAreaView edges={['top']}>
        <View style={styles.headerContent}>
          <View style={styles.headerTextRow}>
            <View>
              <Text style={styles.headerTitle}>Water Tracker</Text>
              <Text style={styles.headerSubtitle}>Stay hydrated, stay healthy</Text>
            </View>
            <View style={styles.streakPill}>
              <Ionicons name="flame" size={14} color="#FFF3CD" />
              <Text style={styles.streakText}>{getCurrentStreak()} day streak</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );

  // Hero Card - Main progress display
  const HeroCard = () => (
    <View style={styles.heroWrapper}>
      <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.heroTopRow}>
          <View>
            <Text style={[styles.heroTitle, { color: colors.text }]}>Today's Hydration</Text>
            <Text style={[styles.heroSubtitle, { color: colors.subtext }]}>
              {todayWater >= dailyGoal ? "You've reached your goal!" : `${dailyGoal - todayWater} glasses to go`}
            </Text>
          </View>
          <View style={styles.heroBadge}>
            <MaterialCommunityIcons name="cup-water" size={16} color="#0EA5E9" />
            <Text style={styles.heroBadgeText}>{getProgressPercentage()}%</Text>
          </View>
        </View>

        {/* Water visual display */}
        <View style={styles.waterVisualContainer}>
          <View style={[styles.waterTank, { backgroundColor: theme === 'light' ? '#E0F2FE' : '#0C4A6E' }]}>
            <View 
              style={[
                styles.waterFill, 
                { 
                  height: `${getProgressPercentage()}%`,
                  backgroundColor: todayWater >= dailyGoal ? '#22C55E' : '#0EA5E9',
                }
              ]} 
            />
            <View style={styles.waterDroplets}>
              {[...Array(Math.min(todayWater, dailyGoal))].map((_, i) => (
                <Text key={i} style={styles.dropletIcon}>💧</Text>
              ))}
            </View>
          </View>
          
          <View style={styles.waterStatsColumn}>
            <View style={styles.waterMainStat}>
              <Text style={[styles.waterMainValue, { color: colors.text }]}>{todayWater}</Text>
              <Text style={[styles.waterMainUnit, { color: colors.subtext }]}>/ {dailyGoal} glasses</Text>
            </View>
            
            {/* Quick add/remove buttons */}
            <View style={styles.quickActionRow}>
              <TouchableOpacity
                style={[styles.quickActionBtn, styles.removeBtn]}
                onPress={removeWaterGlass}
                disabled={todayWater <= 0}
              >
                <Ionicons name="remove" size={24} color={todayWater <= 0 ? '#9CA3AF' : '#EF4444'} />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.quickActionBtn, styles.addBtn]}
                onPress={addWaterGlass}
              >
                <Ionicons name="add" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Progress bar */}
        <View style={[styles.heroBarBg, { backgroundColor: theme === 'light' ? '#E5E7EB' : '#1F2937' }]}>
          <View
            style={[
              styles.heroBarFill,
              {
                width: `${waterPct * 100}%`,
                backgroundColor: todayWater >= dailyGoal ? '#22C55E' : '#0EA5E9',
              },
            ]}
          />
        </View>
      </View>
    </View>
  );

  // Stats Grid
  const StatsGrid = () => (
    <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Weekly Stats</Text>
      <View style={styles.statsGrid}>
        <View style={[styles.statTile, { backgroundColor: theme === 'light' ? '#F3F4F6' : '#111827' }]}>
          <View style={[styles.statIconBubble, { backgroundColor: '#0EA5E9' }]}>
            <MaterialCommunityIcons name="cup-water" size={18} color="#fff" />
          </View>
          <Text style={[styles.statLabel, { color: colors.subtext }]}>Today</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{todayWater}</Text>
          <Text style={[styles.statUnit, { color: colors.subtext }]}>glasses</Text>
        </View>

        <View style={[styles.statTile, { backgroundColor: theme === 'light' ? '#F3F4F6' : '#111827' }]}>
          <View style={[styles.statIconBubble, { backgroundColor: '#22C55E' }]}>
            <Ionicons name="stats-chart" size={18} color="#fff" />
          </View>
          <Text style={[styles.statLabel, { color: colors.subtext }]}>Weekly Total</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{weeklyTotal}</Text>
          <Text style={[styles.statUnit, { color: colors.subtext }]}>glasses</Text>
        </View>

        <View style={[styles.statTile, { backgroundColor: theme === 'light' ? '#F3F4F6' : '#111827' }]}>
          <View style={[styles.statIconBubble, { backgroundColor: '#F59E0B' }]}>
            <Ionicons name="trending-up" size={18} color="#fff" />
          </View>
          <Text style={[styles.statLabel, { color: colors.subtext }]}>Daily Avg</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{weeklyAverage}</Text>
          <Text style={[styles.statUnit, { color: colors.subtext }]}>glasses</Text>
        </View>

        <View style={[styles.statTile, { backgroundColor: theme === 'light' ? '#F3F4F6' : '#111827' }]}>
          <View style={[styles.statIconBubble, { backgroundColor: '#8B5CF6' }]}>
            <Ionicons name="trophy" size={18} color="#fff" />
          </View>
          <Text style={[styles.statLabel, { color: colors.subtext }]}>Goals Met</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{daysGoalMet}</Text>
          <Text style={[styles.statUnit, { color: colors.subtext }]}>/ 7 days</Text>
        </View>
      </View>
    </View>
  );

  // Weekly Chart
  const WeeklyChart = () => {
    const max = Math.max(...weeklyHistory.map(d => d.glasses), dailyGoal, 1);
    
    return (
      <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.chartHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>This Week</Text>
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#0EA5E9' }]} />
              <Text style={[styles.legendText, { color: colors.subtext }]}>Below goal</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
              <Text style={[styles.legendText, { color: colors.subtext }]}>Goal met</Text>
            </View>
          </View>
        </View>

        {/* Goal line indicator */}
        <View style={styles.goalLineContainer}>
          <View style={[styles.goalLine, { top: `${100 - (dailyGoal / max) * 100}%` }]}>
            <Text style={styles.goalLineLabel}>{dailyGoal}</Text>
            <View style={styles.goalLineDash} />
          </View>
        </View>

        <View style={styles.chartBarsContainer}>
          {weeklyHistory.map((day, index) => {
            const barHeight = Math.max((day.glasses / max) * 100, 4);
            const isGoalMet = day.glasses >= dailyGoal;
            
            return (
              <View key={index} style={styles.chartBarCol}>
                <View style={styles.chartBarWrapper}>
                  <View
                    style={[
                      styles.chartBar,
                      {
                        height: `${barHeight}%`,
                        backgroundColor: day.glasses === 0 ? '#E5E7EB' : isGoalMet ? '#22C55E' : '#0EA5E9',
                      },
                    ]}
                  />
                </View>
                <Text style={[
                  styles.chartBarLabel, 
                  { 
                    color: day.isToday ? '#0EA5E9' : colors.subtext,
                    fontWeight: day.isToday ? '700' : '600',
                  }
                ]}>
                  {day.dayName}
                </Text>
                <Text style={[styles.chartBarValue, { color: colors.text }]}>{day.glasses}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  // Goal Adjustment Card
  const GoalCard = () => (
    <View style={[styles.goalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.goalHeader}>
        <View style={[styles.goalIconBubble, { backgroundColor: '#E0F2FE' }]}>
          <Ionicons name="flag" size={20} color="#0EA5E9" />
        </View>
        <View style={styles.goalTextContainer}>
          <Text style={[styles.goalTitle, { color: colors.text }]}>Daily Goal</Text>
          <Text style={[styles.goalSubtitle, { color: colors.subtext }]}>Adjust your hydration target</Text>
        </View>
      </View>
      
      <View style={styles.goalAdjustRow}>
        <TouchableOpacity
          style={[styles.goalAdjustBtn, { borderColor: colors.border }]}
          onPress={() => updateDailyGoal(-1)}
        >
          <Ionicons name="remove" size={20} color="#0EA5E9" />
        </TouchableOpacity>
        
        <View style={styles.goalValueContainer}>
          <Text style={[styles.goalValue, { color: colors.text }]}>{dailyGoal}</Text>
          <Text style={[styles.goalUnit, { color: colors.subtext }]}>glasses/day</Text>
        </View>
        
        <TouchableOpacity
          style={[styles.goalAdjustBtn, { borderColor: colors.border }]}
          onPress={() => updateDailyGoal(1)}
        >
          <Ionicons name="add" size={20} color="#0EA5E9" />
        </TouchableOpacity>
      </View>

      {/* Quick preset chips */}
      <View style={styles.presetRow}>
        <Text style={[styles.presetLabel, { color: colors.subtext }]}>Quick set:</Text>
        <View style={styles.presetChips}>
          {[6, 8, 10, 12].map((val) => (
            <TouchableOpacity
              key={val}
              style={[
                styles.presetChip,
                dailyGoal === val && styles.presetChipActive,
              ]}
              onPress={() => {
                setDailyGoal(val);
                updateDailyGoal(val - dailyGoal);
              }}
            >
              <Text style={[
                styles.presetChipText,
                dailyGoal === val && styles.presetChipTextActive,
              ]}>
                {val}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  // Tips Card
  const TipsCard = () => (
    <View style={[styles.tipsCard, { backgroundColor: '#E0F2FE', borderColor: '#BAE6FD' }]}>
      <View style={styles.tipsHeader}>
        <Text style={styles.tipsIcon}>💡</Text>
        <Text style={styles.tipsTitle}>Hydration Tips</Text>
      </View>
      <View style={styles.tipsList}>
        {[
          { icon: '🌅', text: 'Drink a glass when you wake up' },
          { icon: '🏢', text: 'Keep a water bottle at your desk' },
          { icon: '⏰', text: 'Set hourly reminders' },
          { icon: '🏃', text: 'Drink before, during & after workouts' },
          { icon: '🍋', text: 'Add lemon or cucumber for flavor' },
        ].map((tip, index) => (
          <View key={index} style={styles.tipItem}>
            <Text style={styles.tipIcon}>{tip.icon}</Text>
            <Text style={styles.tipText}>{tip.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  if (initialLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header />
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Skeleton Hero */}
          <View style={styles.heroSection}>
            <View style={[styles.heroWrapper]}>
              <View style={[styles.heroCard, styles.skeletonCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.skeletonTitle, { backgroundColor: theme === 'light' ? '#E5E7EB' : '#374151' }]} />
                <View style={[styles.skeletonWaterTank, { backgroundColor: theme === 'light' ? '#E5E7EB' : '#374151' }]} />
                <View style={[styles.heroBarBg, { backgroundColor: theme === 'light' ? '#E5E7EB' : '#1F2937' }]} />
              </View>
            </View>
          </View>
          
          {/* Skeleton Stats */}
          <View style={styles.section}>
            <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.skeletonTitle, { backgroundColor: theme === 'light' ? '#E5E7EB' : '#374151', marginBottom: 16 }]} />
              <View style={styles.statsGrid}>
                {[1, 2, 3, 4].map((i) => (
                  <View key={i} style={[styles.statTile, { backgroundColor: theme === 'light' ? '#F3F4F6' : '#111827' }]}>
                    <View style={[styles.skeletonCircle, { backgroundColor: theme === 'light' ? '#E5E7EB' : '#374151' }]} />
                    <View style={[styles.skeletonText, { backgroundColor: theme === 'light' ? '#E5E7EB' : '#374151' }]} />
                  </View>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header />
      
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0EA5E9"
            colors={['#0EA5E9']}
          />
        }
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <HeroCard />
        </View>

        {/* Stats Grid */}
        <View style={styles.section}>
          <StatsGrid />
        </View>

        {/* Weekly Chart */}
        <View style={styles.section}>
          <WeeklyChart />
        </View>

        {/* Goal Card */}
        <View style={styles.section}>
          <GoalCard />
        </View>

        {/* Tips */}
        <View style={styles.section}>
          <TipsCard />
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },

  // Header
  header: {
    paddingTop: Platform.OS === 'android' ? 40 : 0,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    paddingTop: 10,
  },
  headerTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  streakText: {
    color: '#FFF3CD',
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '600',
  },

  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  heroSection: {
    paddingHorizontal: 20,
    marginTop: -10,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 20,
  },

  // Hero Card
  heroWrapper: {
    borderRadius: 26,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  heroCard: {
    borderRadius: 26,
    padding: 20,
    borderWidth: 1,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  heroSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  heroBadgeText: {
    color: '#0369A1',
    fontSize: 13,
    marginLeft: 6,
    fontWeight: '700',
  },

  // Water Visual
  waterVisualContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  waterTank: {
    width: 80,
    height: 120,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    marginRight: 24,
  },
  waterFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 16,
  },
  waterDroplets: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    padding: 4,
  },
  dropletIcon: {
    fontSize: 12,
    margin: 1,
  },
  waterStatsColumn: {
    flex: 1,
  },
  waterMainStat: {
    marginBottom: 16,
  },
  waterMainValue: {
    fontSize: 48,
    fontWeight: '800',
  },
  waterMainUnit: {
    fontSize: 16,
    marginTop: 4,
  },
  quickActionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtn: {
    backgroundColor: '#FEE2E2',
  },
  addBtn: {
    backgroundColor: '#0EA5E9',
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  // Progress bar
  heroBarBg: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
  },
  heroBarFill: {
    height: '100%',
    borderRadius: 999,
  },

  // Stats Card
  statsCard: {
    borderRadius: 26,
    padding: 20,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statTile: {
    width: '48%',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  statIconBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 4,
  },
  statUnit: {
    fontSize: 12,
    marginTop: 2,
  },

  // Chart Card
  chartCard: {
    borderRadius: 26,
    padding: 20,
    borderWidth: 1,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  chartLegend: {
    flexDirection: 'row',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  legendText: {
    fontSize: 11,
  },
  goalLineContainer: {
    position: 'relative',
    height: 0,
  },
  goalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  goalLineLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    marginRight: 4,
  },
  goalLineDash: {
    flex: 1,
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  chartBarsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    paddingTop: 20,
  },
  chartBarCol: {
    alignItems: 'center',
    flex: 1,
  },
  chartBarWrapper: {
    width: 24,
    height: 100,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  chartBar: {
    width: '100%',
    borderRadius: 6,
    minHeight: 4,
  },
  chartBarLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  chartBarValue: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Goal Card
  goalCard: {
    borderRadius: 26,
    padding: 20,
    borderWidth: 1,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  goalIconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  goalTextContainer: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  goalSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  goalAdjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 16,
  },
  goalAdjustBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalValueContainer: {
    alignItems: 'center',
    minWidth: 80,
  },
  goalValue: {
    fontSize: 36,
    fontWeight: '800',
  },
  goalUnit: {
    fontSize: 13,
    marginTop: 2,
  },
  presetRow: {
    marginTop: 8,
  },
  presetLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  presetChips: {
    flexDirection: 'row',
    gap: 8,
  },
  presetChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },
  presetChipActive: {
    backgroundColor: '#0EA5E9',
  },
  presetChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  presetChipTextActive: {
    color: '#fff',
  },

  // Tips Card
  tipsCard: {
    borderRadius: 26,
    padding: 20,
    borderWidth: 1,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  tipsIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0369A1',
  },
  tipsList: {
    gap: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tipIcon: {
    fontSize: 16,
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  tipText: {
    fontSize: 14,
    color: '#0369A1',
    flex: 1,
    lineHeight: 20,
  },

  bottomSpacer: {
    height: 20,
  },

  // Skeleton styles
  skeletonCard: {
    minHeight: 200,
  },
  skeletonTitle: {
    height: 24,
    width: 150,
    borderRadius: 8,
    marginBottom: 20,
  },
  skeletonWaterTank: {
    width: 80,
    height: 120,
    borderRadius: 20,
    marginBottom: 20,
  },
  skeletonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginBottom: 12,
  },
  skeletonText: {
    height: 16,
    width: '70%',
    borderRadius: 4,
  },
});

export default WaterTrackerScreen;