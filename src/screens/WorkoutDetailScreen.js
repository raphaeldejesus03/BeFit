// src/screens/WorkoutDetailScreen.js - Redesigned with consistent HomeScreen styling
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useTheme } from './ThemeContext';
import { lightTheme, darkTheme } from './themes';
import { LinearGradient } from 'expo-linear-gradient';

const WorkoutDetailScreen = ({ navigation, route }) => {
  const { workout } = route.params;
  const { theme } = useTheme();
  const colors = theme === 'light' ? lightTheme : darkTheme;

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

  const getWorkoutTypeGradient = (type) => {
    switch (type) {
      case 'strength': return ['#FF6B6B', '#FF8E53'];
      case 'cardio': return ['#4ECDC4', '#44A08D'];
      case 'flexibility': return ['#45B7D1', '#2E8BC0'];
      case 'powerlifting': return ['#E74C3C', '#C0392B'];
      case 'olympic_weightlifting': return ['#9B59B6', '#8E44AD'];
      default: return [colors.accent, colors.accent];
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

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner': return '#22C55E';
      case 'intermediate': return '#F59E0B';
      case 'expert': return '#EF4444';
      default: return colors.subtext;
    }
  };

  const handleEdit = () => {
    // Ensure we have the workout ID
    if (!workout || !workout.id) {
      Alert.alert('Error', 'Cannot edit workout - missing workout data');
      return;
    }
    navigation.navigate('EditWorkout', { workout: { ...workout, id: workout.id } });
  };

  const handleDelete = () => {
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
              // Ensure we return to Workout tab
              navigation.navigate('Workout');
              if (navigation.getParent()) {
                navigation.getParent().navigate('Workout');
              }
            } catch (error) {
              console.error('Error deleting workout:', error);
              Alert.alert('Error', 'Failed to delete workout');
            }
          },
        },
      ]
    );
  };

  const typeColor = getWorkoutTypeColor(workout.type);

  // Header Component
  const Header = () => (
    <LinearGradient
      colors={getWorkoutTypeGradient(workout.type)}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.header}
    >
      <SafeAreaView edges={['top']}>
        <View style={styles.headerContent}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity 
              onPress={() => {
                navigation.navigate('Workout');
                if (navigation.getParent()) {
                  navigation.getParent().navigate('Workout');
                }
              }} 
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={handleEdit} style={styles.headerActionButton}>
                <Ionicons name="create-outline" size={22} color="white" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete} style={styles.headerActionButton}>
                <Ionicons name="trash-outline" size={22} color="white" />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.headerMain}>
            <View style={styles.workoutIconLarge}>
              <FontAwesome5 name={getWorkoutTypeIcon(workout.type)} size={28} color={typeColor} />
            </View>
            <Text style={styles.exerciseName}>{workout.exercise}</Text>
            <View style={styles.headerBadges}>
              <View style={styles.typeBadgeHeader}>
                <Text style={styles.typeBadgeText}>{workout.type}</Text>
              </View>
              {workout.sets && Array.isArray(workout.sets) && workout.sets.length > 0 && (
                <View style={styles.trackedBadge}>
                  <Ionicons name="checkmark-circle" size={12} color="#fff" />
                  <Text style={styles.trackedBadgeText}>TRACKED</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );

  // Quick Stats Component
  const QuickStats = () => (
    <View style={[styles.quickStatsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.quickStatsGrid}>
        <View style={[styles.quickStatItem, { backgroundColor: theme === 'light' ? '#F9FAFB' : '#111827' }]}>
          <View style={[styles.quickStatIcon, { backgroundColor: typeColor + '20' }]}>
            <Ionicons name="time" size={22} color={typeColor} />
          </View>
          <Text style={[styles.quickStatValue, { color: colors.text }]}>{workout.duration}</Text>
          <Text style={[styles.quickStatLabel, { color: colors.subtext }]}>Minutes</Text>
        </View>
        
        {workout.sets && workout.sets.length > 0 && (
          <View style={[styles.quickStatItem, { backgroundColor: theme === 'light' ? '#F9FAFB' : '#111827' }]}>
            <View style={[styles.quickStatIcon, { backgroundColor: typeColor + '20' }]}>
              <Ionicons name="fitness" size={22} color={typeColor} />
            </View>
            <Text style={[styles.quickStatValue, { color: colors.text }]}>{workout.sets.length}</Text>
            <Text style={[styles.quickStatLabel, { color: colors.subtext }]}>Sets</Text>
          </View>
        )}
        
        <View style={[styles.quickStatItem, { backgroundColor: theme === 'light' ? '#F9FAFB' : '#111827' }]}>
          <View style={[styles.quickStatIcon, { backgroundColor: typeColor + '20' }]}>
            <Ionicons name="calendar" size={22} color={typeColor} />
          </View>
          <Text style={[styles.quickStatValue, { color: colors.text }]}>
            {new Date(workout.createdAt.toDate()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
          <Text style={[styles.quickStatLabel, { color: colors.subtext }]}>Date</Text>
        </View>
      </View>
    </View>
  );

  // Sets Table Component
  const SetsTable = () => {
    if (!workout.sets || !Array.isArray(workout.sets) || workout.sets.length === 0) {
      return null;
    }

    const totalReps = workout.sets.reduce((sum, set) => sum + (set.reps || 0), 0);
    const totalVolume = workout.sets.reduce(
      (sum, set) => sum + (set.reps || 0) * (set.weight || 0),
      0
    );
    const avgWeight = totalReps > 0 ? totalVolume / totalReps : 0;
    const unit = workout.sets[0]?.unit || 'kg';

    return (
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIconBubble, { backgroundColor: typeColor + '20' }]}>
            <Ionicons name="barbell-outline" size={20} color={typeColor} />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Sets & Reps</Text>
        </View>

        {/* Table */}
        <View style={styles.setsTable}>
          {/* Table Header */}
          <View style={[styles.tableRow, styles.tableHeader, { backgroundColor: theme === 'light' ? '#F3F4F6' : '#1F2937' }]}>
            <Text style={[styles.tableHeaderText, { color: colors.subtext }]}>SET</Text>
            <Text style={[styles.tableHeaderText, { color: colors.subtext }]}>REPS</Text>
            <Text style={[styles.tableHeaderText, { color: colors.subtext }]}>WEIGHT</Text>
            <Text style={[styles.tableHeaderText, { color: colors.subtext }]}>VOLUME</Text>
          </View>
          
          {/* Table Rows */}
          {workout.sets.map((set, index) => (
            <View 
              key={index} 
              style={[
                styles.tableRow,
                { backgroundColor: index % 2 === 0 ? 'transparent' : (theme === 'light' ? '#F9FAFB' : '#111827') }
              ]}
            >
              <View style={styles.setNumberContainer}>
                <View style={[styles.setNumberBubble, { backgroundColor: typeColor }]}>
                  <Text style={styles.setNumberText}>{index + 1}</Text>
                </View>
              </View>
              <Text style={[styles.tableCell, { color: colors.text }]}>{set.reps}</Text>
              <Text style={[styles.tableCell, { color: colors.text }]}>
                {set.weight} {unit}
              </Text>
              <Text style={[styles.tableCellHighlight, { color: typeColor }]}>
                {(set.reps * set.weight).toFixed(0)} {unit}
              </Text>
            </View>
          ))}
        </View>
        
        {/* Summary Stats */}
        <View style={[styles.summaryStats, { backgroundColor: typeColor + '10', borderColor: typeColor + '30' }]}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.subtext }]}>Total Sets</Text>
            <Text style={[styles.summaryValue, { color: typeColor }]}>{workout.sets.length}</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: typeColor + '30' }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.subtext }]}>Total Reps</Text>
            <Text style={[styles.summaryValue, { color: typeColor }]}>{totalReps}</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: typeColor + '30' }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.subtext }]}>Avg Weight</Text>
            <Text style={[styles.summaryValue, { color: typeColor }]}>
              {avgWeight.toFixed(1)} {unit}
            </Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: typeColor + '30' }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.subtext }]}>Total Volume</Text>
            <Text style={[styles.summaryValue, { color: typeColor }]}>
              {totalVolume.toFixed(0)} {unit}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // Metadata Component
  const Metadata = () => {
    const hasMetadata = workout.muscle || workout.difficulty || workout.equipment;
    if (!hasMetadata) return null;

    return (
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIconBubble, { backgroundColor: typeColor + '20' }]}>
            <Ionicons name="information-circle-outline" size={20} color={typeColor} />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Workout Details</Text>
        </View>

        <View style={styles.metadataGrid}>
          {workout.muscle && (
            <View style={[styles.metadataItem, { backgroundColor: theme === 'light' ? '#F9FAFB' : '#111827' }]}>
              <Ionicons name="body-outline" size={20} color={typeColor} />
              <View style={styles.metadataTextContainer}>
                <Text style={[styles.metadataLabel, { color: colors.subtext }]}>Target Muscle</Text>
                <Text style={[styles.metadataValue, { color: colors.text }]}>{workout.muscle}</Text>
              </View>
            </View>
          )}
          
          {workout.difficulty && (
            <View style={[styles.metadataItem, { backgroundColor: theme === 'light' ? '#F9FAFB' : '#111827' }]}>
              <Ionicons name="speedometer-outline" size={20} color={getDifficultyColor(workout.difficulty)} />
              <View style={styles.metadataTextContainer}>
                <Text style={[styles.metadataLabel, { color: colors.subtext }]}>Difficulty</Text>
                <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(workout.difficulty) }]}>
                  <Text style={styles.difficultyText}>{workout.difficulty}</Text>
                </View>
              </View>
            </View>
          )}
          
          {workout.equipment && (
            <View style={[styles.metadataItem, { backgroundColor: theme === 'light' ? '#F9FAFB' : '#111827' }]}>
              <MaterialCommunityIcons name="weight-lifter" size={20} color={typeColor} />
              <View style={styles.metadataTextContainer}>
                <Text style={[styles.metadataLabel, { color: colors.subtext }]}>Equipment</Text>
                <Text style={[styles.metadataValue, { color: colors.text }]}>{workout.equipment}</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  // Notes Component
  const Notes = () => {
    if (!workout.notes) return null;

    return (
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIconBubble, { backgroundColor: typeColor + '20' }]}>
            <Ionicons name="document-text-outline" size={20} color={typeColor} />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Notes</Text>
        </View>
        <Text style={[styles.notesText, { color: colors.text }]}>{workout.notes}</Text>
      </View>
    );
  };

  // Timestamp Component
  const Timestamps = () => (
    <View style={[styles.timestampCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.timestampRow}>
        <View style={[styles.timestampIcon, { backgroundColor: theme === 'light' ? '#F3F4F6' : '#1F2937' }]}>
          <Ionicons name="time-outline" size={16} color={colors.subtext} />
        </View>
        <View style={styles.timestampTextContainer}>
          <Text style={[styles.timestampLabel, { color: colors.subtext }]}>Created</Text>
          <Text style={[styles.timestampValue, { color: colors.text }]}>
            {new Date(workout.createdAt.toDate()).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
      
      {workout.updatedAt && (
        <View style={styles.timestampRow}>
          <View style={[styles.timestampIcon, { backgroundColor: theme === 'light' ? '#F3F4F6' : '#1F2937' }]}>
            <Ionicons name="create-outline" size={16} color={colors.subtext} />
          </View>
          <View style={styles.timestampTextContainer}>
            <Text style={[styles.timestampLabel, { color: colors.subtext }]}>Last edited</Text>
            <Text style={[styles.timestampValue, { color: colors.text }]}>
              {new Date(workout.updatedAt.toDate()).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header />
      
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Stats */}
        <View style={styles.section}>
          <QuickStats />
        </View>

        {/* Sets Table */}
        <View style={styles.section}>
          <SetsTable />
        </View>

        {/* Metadata */}
        <View style={styles.section}>
          <Metadata />
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Notes />
        </View>

        {/* Timestamps */}
        <View style={styles.section}>
          <Timestamps />
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
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    paddingTop: 10,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerMain: {
    alignItems: 'center',
  },
  workoutIconLarge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  exerciseName: {
    fontSize: 26,
    fontWeight: '800',
    color: 'white',
    textAlign: 'center',
    marginBottom: 12,
  },
  headerBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBadgeHeader: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  typeBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  trackedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  trackedBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },

  // Content
  content: {
    flex: 1,
    marginTop: -20,
  },
  contentContainer: {
    paddingTop: 10,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 16,
  },

  // Quick Stats Card
  quickStatsCard: {
    borderRadius: 26,
    padding: 16,
    borderWidth: 1,
  },
  quickStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickStatItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    marginHorizontal: 4,
  },
  quickStatIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  quickStatLabel: {
    fontSize: 12,
  },

  // Section Card
  sectionCard: {
    borderRadius: 26,
    padding: 20,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIconBubble: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },

  // Sets Table
  setsTable: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  tableHeader: {
    paddingVertical: 12,
  },
  tableHeaderText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  setNumberContainer: {
    flex: 1,
    alignItems: 'center',
  },
  setNumberBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setNumberText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
  },
  tableCell: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  tableCellHighlight: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Summary Stats
  summaryStats: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: '100%',
  },
  summaryLabel: {
    fontSize: 11,
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '800',
  },

  // Metadata
  metadataGrid: {
    gap: 12,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 14,
  },
  metadataTextContainer: {
    flex: 1,
  },
  metadataLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  metadataValue: {
    fontSize: 15,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  difficultyBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  difficultyText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'capitalize',
  },

  // Notes
  notesText: {
    fontSize: 15,
    lineHeight: 24,
  },

  // Timestamps
  timestampCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    gap: 16,
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timestampIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  timestampTextContainer: {
    flex: 1,
  },
  timestampLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  timestampValue: {
    fontSize: 14,
    fontWeight: '500',
  },

  bottomSpacer: {
    height: 40,
  },
});

export default WorkoutDetailScreen;