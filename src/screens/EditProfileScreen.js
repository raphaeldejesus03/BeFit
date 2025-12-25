// src/screens/EditProfileScreen.js - FIXED WITH THEME SUPPORT
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { useTheme } from './ThemeContext';
import { lightTheme, darkTheme } from './themes';

const EditProfileScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const colors = theme === 'light' ? lightTheme : darkTheme;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile fields
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [goal, setGoal] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setLoading(false);
          return;
        }

        const ref = doc(db, 'users', user.uid);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();
          setFullName(data.fullName || data.name || '');
          setAge(data.age ? String(data.age) : '');
          setHeightCm(data.heightCm || data.height ? String(data.heightCm || data.height) : '');
          setWeightKg(data.weightKg || data.weight ? String(data.weightKg || data.weight) : '');
          setGoal(data.goal || data.fitnessGoal || '');
        } else {
          // If no profile doc yet, pre-fill name from auth if available
          setFullName(user.displayName || '');
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        Alert.alert('Error', 'Failed to load profile information.');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'You must be logged in to edit your profile.');
      return;
    }

    if (!fullName.trim()) {
      Alert.alert('Missing name', 'Please enter your name.');
      return;
    }

    setSaving(true);
    try {
      const ref = doc(db, 'users', user.uid);

      const profileData = {
        fullName: fullName.trim(),
        name: fullName.trim(), // Keep both for compatibility
        age: age ? Number(age) : null,
        heightCm: heightCm ? Number(heightCm) : null,
        height: heightCm ? Number(heightCm) : null, // Keep both
        weightKg: weightKg ? Number(weightKg) : null,
        weight: weightKg ? Number(weightKg) : null, // Keep both
        goal: goal.trim(),
        fitnessGoal: goal.trim(), // Keep both
        updatedAt: new Date(),
        userId: user.uid,
        email: user.email || null,
      };

      await setDoc(ref, profileData, { merge: true });

      Alert.alert('Saved', 'Your profile has been updated.', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.subtext }]}>
            Loading profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

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
          <Text style={[styles.headerButton, { color: colors.accent }]}>Cancel</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Profile</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Name */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.label, { color: colors.subtext }]}>Full Name</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your name"
              placeholderTextColor={colors.subtext}
            />
          </View>

          {/* Basic info */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Basic Info
            </Text>

            <View style={styles.row}>
              <View style={styles.fieldHalf}>
                <Text style={[styles.label, { color: colors.subtext }]}>Age</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={age}
                  onChangeText={setAge}
                  placeholder="e.g. 22"
                  placeholderTextColor={colors.subtext}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.fieldHalf}>
                <Text style={[styles.label, { color: colors.subtext }]}>
                  Height (cm)
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={heightCm}
                  onChangeText={setHeightCm}
                  placeholder="e.g. 165"
                  placeholderTextColor={colors.subtext}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.fieldHalf}>
                <Text style={[styles.label, { color: colors.subtext }]}>
                  Weight (kg)
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={weightKg}
                  onChangeText={setWeightKg}
                  placeholder="e.g. 60"
                  placeholderTextColor={colors.subtext}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.fieldHalf, { opacity: 0 }]} />
            </View>
          </View>

          {/* Goals */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Fitness Goal
            </Text>
            <Text style={[styles.helperText, { color: colors.subtext }]}>
              (Examples: "Build muscle", "Lose 5kg", "Run 5km", "Stay consistent 3x/week")
            </Text>
            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={goal}
              onChangeText={setGoal}
              placeholder="Describe your main goal..."
              placeholderTextColor={colors.subtext}
              multiline
            />
          </View>

          {/* Save button */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              {
                backgroundColor: saving ? colors.border : colors.accent,
                opacity: saving ? 0.7 : 1,
              },
            ]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
  },
  // Header
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    fontSize: 14,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  // Content
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 11,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 8,
  },
  fieldHalf: {
    flex: 1,
  },
  saveButton: {
    marginTop: 8,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default EditProfileScreen;