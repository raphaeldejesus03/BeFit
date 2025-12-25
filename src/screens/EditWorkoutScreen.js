// src/screens/EditWorkoutScreen.js - Redesigned with consistent HomeScreen styling
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useTheme } from './ThemeContext';
import { lightTheme, darkTheme } from './themes';
import { LinearGradient } from 'expo-linear-gradient';

const EditWorkoutScreen = ({ navigation, route }) => {
  const { workout } = route.params;
  const { theme } = useTheme();
  const colors = theme === 'light' ? lightTheme : darkTheme;

  // Form state - pre-filled with existing workout data
  const [exercise, setExercise] = useState(workout.exercise || '');
  const [type, setType] = useState(workout.type || 'strength');
  const [duration, setDuration] = useState(workout.duration?.toString() || '');
  const [notes, setNotes] = useState(workout.notes || '');
  const [sets, setSets] = useState(
    workout.sets && Array.isArray(workout.sets) 
      ? workout.sets.map(s => ({
          reps: s.reps?.toString() || '',
          weight: s.weight?.toString() || '',
          unit: s.unit || 'kg'
        }))
      : [{ reps: '', weight: '', unit: 'kg' }]
  );
  const [saving, setSaving] = useState(false);

  const workoutTypes = [
    { id: 'strength', label: 'Strength', icon: 'dumbbell', color: '#FF6B6B' },
    { id: 'cardio', label: 'Cardio', icon: 'running', color: '#4ECDC4' },
    { id: 'flexibility', label: 'Flexibility', icon: 'child-reaching', color: '#45B7D1' },
    { id: 'powerlifting', label: 'Powerlifting', icon: 'weight-hanging', color: '#E74C3C' },
    { id: 'olympic_weightlifting', label: 'Olympic', icon: 'weight-lifter', color: '#9B59B6' },
  ];

  const getTypeColor = (typeId) => {
    const found = workoutTypes.find(t => t.id === typeId);
    return found?.color || '#FF6B6B';
  };

  const addSet = () => {
    setSets([...sets, { reps: '', weight: '', unit: 'kg' }]);
  };

  const removeSet = (index) => {
    if (sets.length > 1) {
      setSets(sets.filter((_, i) => i !== index));
    }
  };

  const updateSet = (index, field, value) => {
    const newSets = [...sets];
    newSets[index][field] = value;
    setSets(newSets);
  };

  const handleSave = async () => {
    // Validation
    if (!exercise.trim()) {
      Alert.alert('Error', 'Please enter an exercise name');
      return;
    }
    if (!duration || parseInt(duration) <= 0) {
      Alert.alert('Error', 'Please enter a valid duration');
      return;
    }

    setSaving(true);

    try {
      // Process sets data
      const processedSets = sets
        .filter(s => s.reps && s.weight)
        .map(s => ({
          reps: parseInt(s.reps) || 0,
          weight: parseFloat(s.weight) || 0,
          unit: s.unit || 'kg'
        }));

      const workoutData = {
        exercise: exercise.trim(),
        type,
        duration: parseInt(duration),
        notes: notes.trim(),
        sets: processedSets,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, 'workouts', workout.id), workoutData);

      Alert.alert('Success', 'Workout updated successfully!', [
        {
          text: 'OK',
          onPress: () => {
            navigation.navigate('Workout');
            if (navigation.getParent()) {
              navigation.getParent().navigate('Workout');
            }
          }
        }
      ]);
    } catch (error) {
      console.error('Error updating workout:', error);
      Alert.alert('Error', 'Failed to update workout. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const typeColor = getTypeColor(type);

  // Header Component
  const Header = () => (
    <LinearGradient
      colors={[typeColor, typeColor + 'DD', typeColor + 'BB']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.header}
    >
      <SafeAreaView edges={['top']}>
        <View style={styles.headerContent}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()} 
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleSave} 
              style={styles.saveButton}
              disabled={saving}
            >
              {saving ? (
                <Text style={styles.saveButtonText}>Saving...</Text>
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color={typeColor} />
                  <Text style={[styles.saveButtonText, { color: typeColor }]}>Save</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          
          <View style={styles.headerMain}>
            <View style={styles.headerIconLarge}>
              <FontAwesome5 
                name={workoutTypes.find(t => t.id === type)?.icon || 'dumbbell'} 
                size={24} 
                color={typeColor} 
              />
            </View>
            <Text style={styles.headerTitle}>Edit Workout</Text>
            <Text style={styles.headerSubtitle}>Update your workout details</Text>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Exercise Name Card */}
          <View style={styles.section}>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconBubble, { backgroundColor: typeColor + '20' }]}>
                  <Ionicons name="barbell-outline" size={20} color={typeColor} />
                </View>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Exercise Name</Text>
              </View>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: theme === 'light' ? '#F9FAFB' : '#111827',
                  color: colors.text,
                  borderColor: colors.border
                }]}
                value={exercise}
                onChangeText={setExercise}
                placeholder="e.g., Bench Press, Squats..."
                placeholderTextColor={colors.subtext}
              />
            </View>
          </View>

          {/* Workout Type Card */}
          <View style={styles.section}>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconBubble, { backgroundColor: typeColor + '20' }]}>
                  <Ionicons name="fitness-outline" size={20} color={typeColor} />
                </View>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Workout Type</Text>
              </View>
              <View style={styles.typeGrid}>
                {workoutTypes.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.typeButton,
                      { 
                        backgroundColor: type === t.id ? t.color + '20' : (theme === 'light' ? '#F9FAFB' : '#111827'),
                        borderColor: type === t.id ? t.color : 'transparent',
                        borderWidth: type === t.id ? 2 : 0,
                      }
                    ]}
                    onPress={() => setType(t.id)}
                  >
                    <FontAwesome5 
                      name={t.icon} 
                      size={18} 
                      color={type === t.id ? t.color : colors.subtext} 
                    />
                    <Text style={[
                      styles.typeButtonText, 
                      { color: type === t.id ? t.color : colors.subtext }
                    ]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Duration Card */}
          <View style={styles.section}>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconBubble, { backgroundColor: typeColor + '20' }]}>
                  <Ionicons name="time-outline" size={20} color={typeColor} />
                </View>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Duration</Text>
              </View>
              <View style={styles.durationRow}>
                <TextInput
                  style={[styles.durationInput, { 
                    backgroundColor: theme === 'light' ? '#F9FAFB' : '#111827',
                    color: colors.text,
                    borderColor: colors.border
                  }]}
                  value={duration}
                  onChangeText={setDuration}
                  placeholder="0"
                  placeholderTextColor={colors.subtext}
                  keyboardType="numeric"
                />
                <Text style={[styles.durationUnit, { color: colors.subtext }]}>minutes</Text>
              </View>
            </View>
          </View>

          {/* Sets & Reps Card */}
          <View style={styles.section}>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconBubble, { backgroundColor: typeColor + '20' }]}>
                  <Ionicons name="list-outline" size={20} color={typeColor} />
                </View>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Sets & Reps</Text>
                <TouchableOpacity 
                  style={[styles.addSetButton, { backgroundColor: typeColor }]}
                  onPress={addSet}
                >
                  <Ionicons name="add" size={18} color="white" />
                </TouchableOpacity>
              </View>

              {/* Sets Table Header */}
              <View style={[styles.setsHeader, { backgroundColor: theme === 'light' ? '#F3F4F6' : '#1F2937' }]}>
                <Text style={[styles.setsHeaderText, { color: colors.subtext, flex: 0.5 }]}>SET</Text>
                <Text style={[styles.setsHeaderText, { color: colors.subtext }]}>REPS</Text>
                <Text style={[styles.setsHeaderText, { color: colors.subtext }]}>WEIGHT</Text>
                <Text style={[styles.setsHeaderText, { color: colors.subtext, flex: 0.3 }]}></Text>
              </View>

              {/* Sets Rows */}
              {sets.map((set, index) => (
                <View 
                  key={index} 
                  style={[
                    styles.setRow,
                    { backgroundColor: index % 2 === 0 ? 'transparent' : (theme === 'light' ? '#F9FAFB' : '#111827') }
                  ]}
                >
                  <View style={[styles.setNumberBubble, { backgroundColor: typeColor }]}>
                    <Text style={styles.setNumberText}>{index + 1}</Text>
                  </View>
                  <TextInput
                    style={[styles.setInput, { 
                      backgroundColor: theme === 'light' ? '#F9FAFB' : '#1F2937',
                      color: colors.text,
                      borderColor: colors.border
                    }]}
                    value={set.reps}
                    onChangeText={(val) => updateSet(index, 'reps', val)}
                    placeholder="0"
                    placeholderTextColor={colors.subtext}
                    keyboardType="numeric"
                  />
                  <View style={styles.weightInputContainer}>
                    <TextInput
                      style={[styles.setInput, { 
                        backgroundColor: theme === 'light' ? '#F9FAFB' : '#1F2937',
                        color: colors.text,
                        borderColor: colors.border
                      }]}
                      value={set.weight}
                      onChangeText={(val) => updateSet(index, 'weight', val)}
                      placeholder="0"
                      placeholderTextColor={colors.subtext}
                      keyboardType="numeric"
                    />
                    <Text style={[styles.unitText, { color: colors.subtext }]}>kg</Text>
                  </View>
                  {sets.length > 1 && (
                    <TouchableOpacity 
                      style={styles.removeSetButton}
                      onPress={() => removeSet(index)}
                    >
                      <Ionicons name="close-circle" size={22} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          </View>

          {/* Notes Card */}
          <View style={styles.section}>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconBubble, { backgroundColor: typeColor + '20' }]}>
                  <Ionicons name="document-text-outline" size={20} color={typeColor} />
                </View>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Notes</Text>
              </View>
              <TextInput
                style={[styles.notesInput, { 
                  backgroundColor: theme === 'light' ? '#F9FAFB' : '#111827',
                  color: colors.text,
                  borderColor: colors.border
                }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add any notes about this workout..."
                placeholderTextColor={colors.subtext}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Save Button */}
          <View style={styles.section}>
            <TouchableOpacity 
              style={styles.saveButtonLarge}
              onPress={handleSave}
              disabled={saving}
            >
              <LinearGradient
                colors={[typeColor, typeColor + 'DD']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveButtonGradient}
              >
                {saving ? (
                  <Text style={styles.saveButtonLargeText}>Saving...</Text>
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={22} color="white" />
                    <Text style={styles.saveButtonLargeText}>Save Changes</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },

  // Header
  header: {
    paddingTop: Platform.OS === 'android' ? 40 : 0,
    paddingBottom: 24,
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
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  headerMain: {
    alignItems: 'center',
  },
  headerIconLarge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
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
    marginTop: 16,
  },

  // Card
  card: {
    borderRadius: 26,
    padding: 20,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIconBubble: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },

  // Text Input
  textInput: {
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
  },

  // Type Grid
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeButton: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Duration
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  durationInput: {
    borderRadius: 14,
    padding: 16,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    width: 100,
    borderWidth: 1,
  },
  durationUnit: {
    fontSize: 16,
    fontWeight: '500',
  },

  // Sets
  addSetButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  setsHeaderText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 8,
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
  setInput: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    borderWidth: 1,
  },
  weightInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  unitText: {
    fontSize: 12,
    fontWeight: '600',
  },
  removeSetButton: {
    padding: 4,
  },

  // Notes
  notesInput: {
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    minHeight: 100,
    borderWidth: 1,
  },

  // Save Button Large
  saveButtonLarge: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  saveButtonLargeText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '700',
  },

  bottomSpacer: {
    height: 40,
  },
});

export default EditWorkoutScreen;