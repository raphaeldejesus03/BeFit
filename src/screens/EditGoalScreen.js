// src/screens/EditGoalScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { useTheme } from './ThemeContext';
import { lightTheme, darkTheme } from './themes';

const EditGoalScreen = ({ navigation, route }) => {
  const { goalType, currentValue } = route.params;
  const [newValue, setNewValue] = useState(currentValue.toString());
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();
  const colors = theme === 'light' ? lightTheme : darkTheme;

  const getGoalTitle = type =>
    ({
      weeklyWorkouts: 'Weekly Workouts',
      weeklyDuration: 'Weekly Minutes',
      dailyWater: 'Daily Water (glasses)',
      monthlyWorkouts: 'Monthly Workouts',
    }[type] || '');

  const getGoalIcon = type =>
    ({
      weeklyWorkouts: '🏋️‍♂️',
      weeklyDuration: '⏱️',
      dailyWater: '💧',
      monthlyWorkouts: '📅',
    }[type] || '🎯');

  const getGoalHint = type =>
    ({
      weeklyWorkouts: 'How many workouts per week?',
      weeklyDuration: 'How many minutes per week?',
      dailyWater: 'How many glasses per day?',
      monthlyWorkouts: 'How many workouts per month?',
    }[type] || '');

  const getSuggestions = type =>
    ({
      weeklyWorkouts: ['2', '3', '4', '5'],
      weeklyDuration: ['90', '120', '150', '180'],
      dailyWater: ['6', '8', '10', '12'],
      monthlyWorkouts: ['8', '12', '16', '20'],
    }[type] || []);

  const updateGoal = async () => {
    if (!newValue || isNaN(parseInt(newValue)) || parseInt(newValue) < 1) {
      Alert.alert('Error', 'Please enter a valid number greater than 0');
      return;
    }

    setLoading(true);
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const currentGoals = userDoc.data().goals || {};
        await updateDoc(userRef, {
          goals: { ...currentGoals, [goalType]: parseInt(newValue) },
        });
      } else {
        await setDoc(userRef, {
          goals: { [goalType]: parseInt(newValue) },
          email: auth.currentUser.email,
          createdAt: new Date(),
        });
      }

      Alert.alert('Success', 'Goal updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', `Failed to update goal: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const SuggestionButton = ({ value }) => {
    const active = newValue === value;
    return (
      <TouchableOpacity
        style={[
          styles.suggestionButton,
          {
            backgroundColor: active ? colors.accent : colors.card,
            borderColor: active ? colors.accent : colors.border,
          },
        ]}
        onPress={() => setNewValue(value)}
      >
        <Text
          style={[
            styles.suggestionText,
            { color: active ? colors.inverseText : colors.text },
          ]}
        >
          {value}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.cancelButton, { color: colors.accent }]}>Cancel</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Edit Goal</Text>
        <TouchableOpacity onPress={updateGoal} disabled={loading}>
          <Text
            style={[
              styles.saveButton,
              { color: colors.accent, opacity: loading ? 0.5 : 1 },
            ]}
          >
            {loading ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.goalInfoContainer}>
          <Text style={styles.goalIcon}>{getGoalIcon(goalType)}</Text>
          <Text style={[styles.goalTitle, { color: colors.text }]}>
            {getGoalTitle(goalType)}
          </Text>
          <Text style={[styles.goalHint, { color: colors.subtext }]}>
            {getGoalHint(goalType)}
          </Text>
        </View>

        {/* Current Value Display */}
        <View
          style={[
            styles.currentValueContainer,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.currentValueLabel, { color: colors.subtext }]}>
            Current Goal:
          </Text>
          <Text style={[styles.currentValue, { color: colors.accent }]}>
            {currentValue}
          </Text>
        </View>

        {/* Input Field */}
        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { color: colors.text }]}>New Goal Value</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            value={newValue}
            onChangeText={setNewValue}
            keyboardType="numeric"
            placeholder="Enter goal value"
            placeholderTextColor={colors.subtext}
            returnKeyType="done"
            autoFocus
          />
        </View>

        {/* Quick Suggestions */}
        <View style={styles.suggestionsContainer}>
          <Text style={[styles.suggestionsTitle, { color: colors.text }]}>
            Quick Select:
          </Text>
          <View style={styles.suggestionsGrid}>
            {getSuggestions(goalType).map(v => (
              <SuggestionButton key={v} value={v} />
            ))}
          </View>
        </View>

        {/* Goal Tips */}
        <View
          style={[
            styles.tipsContainer,
            {
              backgroundColor: theme === 'light' ? '#E3F2FD' : '#102A43',
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.tipsTitle, { color: colors.accent }]}>💡 Tips</Text>
          {goalType === 'weeklyWorkouts' && (
            <>
              <Text style={[styles.tipText, { color: colors.text }]}>
                • Beginners: Start with 2–3 workouts per week
              </Text>
              <Text style={[styles.tipText, { color: colors.text }]}>
                • Intermediate: Aim for 3–4 workouts per week
              </Text>
              <Text style={[styles.tipText, { color: colors.text }]}>
                • Advanced: 4–5 workouts per week
              </Text>
            </>
          )}
          {goalType === 'weeklyDuration' && (
            <>
              <Text style={[styles.tipText, { color: colors.text }]}>
                • WHO recommends 150 minutes per week
              </Text>
              <Text style={[styles.tipText, { color: colors.text }]}>
                • Break it down: 30 min × 5 days
              </Text>
              <Text style={[styles.tipText, { color: colors.text }]}>
                • Include both cardio and strength training
              </Text>
            </>
          )}
          {goalType === 'dailyWater' && (
            <>
              <Text style={[styles.tipText, { color: colors.text }]}>
                • General guideline: 8 glasses (8oz each)
              </Text>
              <Text style={[styles.tipText, { color: colors.text }]}>
                • More if you exercise regularly
              </Text>
              <Text style={[styles.tipText, { color: colors.text }]}>
                • Listen to your body's thirst signals
              </Text>
            </>
          )}
          {goalType === 'monthlyWorkouts' && (
            <>
              <Text style={[styles.tipText, { color: colors.text }]}>
                • Consistency is key for progress
              </Text>
              <Text style={[styles.tipText, { color: colors.text }]}>
                • Allow rest days for recovery
              </Text>
              <Text style={[styles.tipText, { color: colors.text }]}>
                • Gradually increase as you build habits
              </Text>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  cancelButton: { fontSize: 16 },
  title: { fontSize: 18, fontWeight: 'bold' },
  saveButton: { fontSize: 16, fontWeight: '600' },
  content: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  goalInfoContainer: { alignItems: 'center', marginBottom: 30 },
  goalIcon: { fontSize: 48, marginBottom: 15 },
  goalTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  goalHint: { fontSize: 16, textAlign: 'center' },
  currentValueContainer: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
  },
  currentValueLabel: { fontSize: 14, marginBottom: 5 },
  currentValue: { fontSize: 32, fontWeight: 'bold' },
  inputContainer: { marginBottom: 30 },
  inputLabel: { fontSize: 16, fontWeight: '600', marginBottom: 10 },
  input: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 8,
    fontSize: 18,
    borderWidth: 1,
    textAlign: 'center',
  },
  suggestionsContainer: { marginBottom: 30 },
  suggestionsTitle: { fontSize: 16, fontWeight: '600', marginBottom: 15 },
  suggestionsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  suggestionButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  suggestionText: { fontSize: 16, fontWeight: '600' },
  tipsContainer: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  tipsTitle: { fontSize: 16, fontWeight: '600', marginBottom: 15 },
  tipText: { fontSize: 14, marginBottom: 8, lineHeight: 20 },
});

export default EditGoalScreen;