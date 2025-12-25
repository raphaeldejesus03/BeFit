// src/screens/WorkoutScreen.js - Redesigned with consistent HomeScreen styling
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  Platform,
  UIManager,
  LayoutAnimation,
} from 'react-native';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from './ThemeContext';
import { lightTheme, darkTheme } from './themes';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const WorkoutScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const colors = theme === 'light' ? lightTheme : darkTheme;
  
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Refresh workouts when screen comes into focus (after adding/editing a workout)
  useFocusEffect(
    React.useCallback(() => {
      fetchWorkouts();
    }, [])
  );

  useEffect(() => {
    fetchWorkouts();
  }, []);

  const fetchWorkouts = async () => {
    try {
      const workoutsQuery = query(
        collection(db, 'workouts'),
        where('userId', '==', auth.currentUser.uid)
      );
      const querySnapshot = await getDocs(workoutsQuery);
      
      const workoutList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort in JavaScript instead of Firestore
      workoutList.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
        const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
        return dateB - dateA; // Most recent first
      });
      
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setWorkouts(workoutList);
    } catch (error) {
      console.error('Error fetching workouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchWorkouts();
    setRefreshing(false);
  };

  const navigateToAddWorkout = () => {
    navigation.navigate('AddWorkout');
  };

  const navigateToEditWorkout = (workout) => {
    navigation.navigate('EditWorkout', { workout });
  };

  const deleteWorkout = (workout) => {
    Alert.alert(
      'Delete Workout',
      `Are you sure you want to delete "${workout.exercise}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'workouts', workout.id));
              Alert.alert('Success', 'Workout deleted successfully!');
              fetchWorkouts(); // Refresh the list
            } catch (error) {
              console.error('Error deleting workout:', error);
              Alert.alert('Error', 'Failed to delete workout');
            }
          }
        }
      ]
    );
  };

  const getWorkoutTypeColor = (type) => {
    switch (type) {
      case 'strength': return '#FF6B6B';
      case 'cardio': return '#4ECDC4';
      case 'flexibility': return '#45B7D1';
      case 'powerlifting': return '#E74C3C';
      case 'olympic_weightlifting': return '#9B59B6';
      default: return colors.accent;
    }
  };

  const getWorkoutTypeIcon = (type) => {
    switch (type) {
      case 'strength': return 'dumbbell';
      case 'cardio': return 'running';
      case 'flexibility': return 'child-reaching';
      case 'powerlifting': return 'weight-hanging';
      case 'olympic_weightlifting': return 'weight-lifter';
      default: return 'dumbbell';
    }
  };

  const navigateToWorkoutDetail = (workout) => {
    navigation.navigate('WorkoutDetail', { workout });
  };

  // Header Component
  const Header = () => (
    <LinearGradient
      colors={['#FF6B6B', '#FF8E53', '#FF6B6B']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.header}
    >
      <SafeAreaView edges={['top']}>
        <View style={styles.headerContent}>
          <View style={styles.headerTextRow}>
            <View>
              <Text style={styles.headerTitle}>Workouts</Text>
              <Text style={styles.headerSubtitle}>Track your fitness journey</Text>
            </View>
            <TouchableOpacity 
              style={styles.addButtonHeader}
              onPress={navigateToAddWorkout}
            >
              <Ionicons name="add" size={24} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );

  // Stats Card Component
  const WorkoutStats = () => {
    const totalWorkouts = workouts.length;
    const totalDuration = workouts.reduce((sum, workout) => sum + (workout.duration || 0), 0);
    const thisWeek = workouts.filter(workout => {
      const workoutDate = new Date(workout.createdAt.toDate());
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return workoutDate >= weekAgo;
    }).length;

    const avgDuration = totalWorkouts > 0 ? Math.round(totalDuration / totalWorkouts) : 0;

    return (
      <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Progress</Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statTile, { backgroundColor: theme === 'light' ? '#FFF5F5' : '#2D1F1F' }]}>
            <View style={[styles.statIconBubble, { backgroundColor: '#FF6B6B' }]}>
              <FontAwesome5 name="dumbbell" size={16} color="#fff" />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{totalWorkouts}</Text>
            <Text style={[styles.statLabel, { color: colors.subtext }]}>Total Workouts</Text>
          </View>

          <View style={[styles.statTile, { backgroundColor: theme === 'light' ? '#F0FDF4' : '#1A2E1A' }]}>
            <View style={[styles.statIconBubble, { backgroundColor: '#22C55E' }]}>
              <Ionicons name="time" size={18} color="#fff" />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{Math.round(totalDuration / 60 * 10) / 10}</Text>
            <Text style={[styles.statLabel, { color: colors.subtext }]}>Hours Trained</Text>
          </View>

          <View style={[styles.statTile, { backgroundColor: theme === 'light' ? '#FFF7ED' : '#2D2418' }]}>
            <View style={[styles.statIconBubble, { backgroundColor: '#F59E0B' }]}>
              <Ionicons name="flame" size={18} color="#fff" />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{thisWeek}</Text>
            <Text style={[styles.statLabel, { color: colors.subtext }]}>This Week</Text>
          </View>

          <View style={[styles.statTile, { backgroundColor: theme === 'light' ? '#F5F3FF' : '#1F1D2E' }]}>
            <View style={[styles.statIconBubble, { backgroundColor: '#8B5CF6' }]}>
              <Ionicons name="trending-up" size={18} color="#fff" />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{avgDuration}</Text>
            <Text style={[styles.statLabel, { color: colors.subtext }]}>Avg Minutes</Text>
          </View>
        </View>
      </View>
    );
  };

  // Workout Card Component
  const WorkoutCard = ({ workout }) => {
    const typeColor = getWorkoutTypeColor(workout.type);
    
    return (
      <TouchableOpacity 
        style={[styles.workoutCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => navigateToWorkoutDetail(workout)}
        activeOpacity={0.7}
      >
        {/* Left accent bar */}
        <View style={[styles.cardAccent, { backgroundColor: typeColor }]} />
        
        <View style={styles.cardContent}>
          {/* Header with exercise name and icon */}
          <View style={styles.workoutHeader}>
            <View style={[styles.workoutIconBubble, { backgroundColor: typeColor + '20' }]}>
              <FontAwesome5 name={getWorkoutTypeIcon(workout.type)} size={18} color={typeColor} />
            </View>
            <View style={styles.exerciseNameContainer}>
              <Text style={[styles.workoutExercise, { color: colors.text }]} numberOfLines={1}>
                {workout.exercise}
              </Text>
              {/* Badges row */}
              <View style={styles.badgesRow}>
                <View style={[styles.workoutTypeBadge, { backgroundColor: typeColor + '20' }]}>
                  <Text style={[styles.workoutType, { color: typeColor }]}>
                    {workout.type}
                  </Text>
                </View>
                {workout.sets && Array.isArray(workout.sets) && workout.sets.length > 0 && (
                  <View style={[styles.statusBadge, { backgroundColor: '#22C55E20' }]}>
                    <Ionicons name="checkmark-circle" size={10} color="#22C55E" />
                    <Text style={[styles.statusBadgeText, { color: '#22C55E' }]}>TRACKED</Text>
                  </View>
                )}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
          </View>

          {/* Stats Grid */}
          <View style={styles.cardStatsGrid}>
            {/* Duration */}
            <View style={[styles.cardStatItem, { backgroundColor: theme === 'light' ? '#F9FAFB' : '#111827' }]}>
              <Ionicons name="time-outline" size={16} color={typeColor} />
              <Text style={[styles.cardStatValue, { color: colors.text }]}>{workout.duration}</Text>
              <Text style={[styles.cardStatLabel, { color: colors.subtext }]}>min</Text>
            </View>

            {/* Sets/Reps */}
            {workout.sets && Array.isArray(workout.sets) && workout.sets.length > 0 ? (
              <View style={[styles.cardStatItem, { backgroundColor: theme === 'light' ? '#F9FAFB' : '#111827' }]}>
                <Ionicons name="barbell-outline" size={16} color={typeColor} />
                <Text style={[styles.cardStatValue, { color: colors.text }]}>{workout.sets.length}</Text>
                <Text style={[styles.cardStatLabel, { color: colors.subtext }]}>sets</Text>
              </View>
            ) : workout.reps ? (
              <View style={[styles.cardStatItem, { backgroundColor: theme === 'light' ? '#F9FAFB' : '#111827' }]}>
                <Ionicons name="repeat-outline" size={16} color={typeColor} />
                <Text style={[styles.cardStatValue, { color: colors.text }]}>{workout.reps}</Text>
                <Text style={[styles.cardStatLabel, { color: colors.subtext }]}>reps</Text>
              </View>
            ) : null}

            {/* Total Reps or Muscle */}
            {workout.sets && Array.isArray(workout.sets) && workout.sets.length > 0 ? (
              <View style={[styles.cardStatItem, { backgroundColor: theme === 'light' ? '#F9FAFB' : '#111827' }]}>
                <Ionicons name="fitness-outline" size={16} color={typeColor} />
                <Text style={[styles.cardStatValue, { color: colors.text }]}>
                  {workout.sets.reduce((sum, set) => sum + (set.reps || 0), 0)}
                </Text>
                <Text style={[styles.cardStatLabel, { color: colors.subtext }]}>reps</Text>
              </View>
            ) : workout.muscle ? (
              <View style={[styles.cardStatItem, { backgroundColor: theme === 'light' ? '#F9FAFB' : '#111827' }]}>
                <Ionicons name="body-outline" size={16} color={typeColor} />
                <Text style={[styles.cardStatValue, { color: colors.text }]} numberOfLines={1}>
                  {workout.muscle}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Notes preview */}
          {workout.notes && (
            <View style={[styles.notesPreview, { backgroundColor: theme === 'light' ? '#F9FAFB' : '#111827' }]}>
              <Ionicons name="document-text-outline" size={14} color={colors.subtext} />
              <Text style={[styles.notesText, { color: colors.subtext }]} numberOfLines={2}>
                {workout.notes}
              </Text>
            </View>
          )}

          {/* Footer with date */}
          <View style={styles.cardFooter}>
            <View style={styles.dateContainer}>
              <Ionicons name="calendar-outline" size={14} color={colors.subtext} />
              <Text style={[styles.workoutDate, { color: colors.subtext }]}>
                {new Date(workout.createdAt.toDate()).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
            </View>
            {workout.updatedAt && (
              <View style={[styles.editedBadge, { backgroundColor: colors.subtext + '20' }]}>
                <Ionicons name="create-outline" size={10} color={colors.subtext} />
                <Text style={[styles.editedText, { color: colors.subtext }]}>Edited</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Empty State Component
  const EmptyState = () => (
    <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.emptyIconContainer}>
        <LinearGradient
          colors={['#FF6B6B', '#FF8E53']}
          style={styles.emptyIconGradient}
        >
          <FontAwesome5 name="dumbbell" size={32} color="#fff" />
        </LinearGradient>
      </View>
      <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No workouts yet</Text>
      <Text style={[styles.emptyStateText, { color: colors.subtext }]}>
        Start your fitness journey by logging your first workout!
      </Text>
      <TouchableOpacity 
        style={styles.startButton}
        onPress={navigateToAddWorkout}
      >
        <LinearGradient
          colors={['#FF6B6B', '#FF8E53']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.startButtonGradient}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.startButtonText}>Log First Workout</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  // Recent workouts section header
  const RecentHeader = () => (
    <View style={styles.recentHeader}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Workouts</Text>
      <View style={[styles.countBadge, { backgroundColor: colors.accent + '20' }]}>
        <Text style={[styles.countText, { color: colors.accent }]}>{workouts.length}</Text>
      </View>
    </View>
  );

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
            tintColor="#FF6B6B"
            colors={['#FF6B6B']}
          />
        }
      >
        {/* Stats Section */}
        {workouts.length > 0 && (
          <View style={styles.section}>
            <WorkoutStats />
          </View>
        )}

        {/* Workouts List */}
        <View style={styles.section}>
          {workouts.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <RecentHeader />
              {workouts.map((workout) => (
                <WorkoutCard key={workout.id} workout={workout} />
              ))}
            </>
          )}
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
  addButtonHeader: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },

  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 20,
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
    alignItems: 'center',
  },
  statIconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },

  // Recent Header
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  countText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Workout Card
  workoutCard: {
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardAccent: {
    width: 5,
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  workoutIconBubble: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  exerciseNameContainer: {
    flex: 1,
    marginRight: 8,
  },
  workoutExercise: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  workoutTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  workoutType: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Card Stats
  cardStatsGrid: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  cardStatItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  cardStatValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardStatLabel: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Notes
  notesPreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  notesText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },

  // Footer
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  workoutDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  editedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  editedText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Empty State
  emptyCard: {
    borderRadius: 26,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyIconContainer: {
    marginBottom: 20,
  },
  emptyIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  startButton: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 8,
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },

  bottomSpacer: {
    height: 20,
  },
});

export default WorkoutScreen;