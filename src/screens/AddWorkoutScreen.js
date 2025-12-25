import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Image,
  ActivityIndicator,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { useTheme } from './ThemeContext';
import { lightTheme, darkTheme } from './themes';
import { recordWorkoutGamification } from '../gamification/engine';
import {
  searchExercisesByName,
  getTypeColor,
  getDifficultyColor,
  isAPIKeyConfigured,
} from '../services/exerciseAPI';

const AddWorkoutScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const colors = theme === 'light' ? lightTheme : darkTheme;

  const [formData, setFormData] = useState({
    exercise: '',
    duration: '',
    notes: '',
    type: 'general',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [weightUnit, setWeightUnit] = useState('kg');
  const [sets, setSets] = useState([{ id: 1, reps: '', weight: '' }]);
  const [youtubeVideo, setYoutubeVideo] = useState(null);
  const [loadingVideo, setLoadingVideo] = useState(false);

  // Search YouTube video for exercise demonstration
  const searchYoutubeVideo = async (exerciseName) => {
    setLoadingVideo(true);
    try {
      const query = encodeURIComponent(`${exerciseName} exercise tutorial`);
      // Using YouTube's oEmbed API to get video info
      const searchUrl = `https://www.youtube.com/results?search_query=${query}`;
      
      // Generate a video ID based on the exercise name (simplified approach)
      // In a production app, you'd use YouTube Data API v3
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&maxResults=1&key=YOUR_YOUTUBE_API_KEY`
      ).catch(() => null);

      if (response && response.ok) {
        const data = await response.json();
        if (data.items && data.items.length > 0) {
          const video = data.items[0];
          setYoutubeVideo({
            id: video.id.videoId,
            title: video.snippet.title,
            thumbnail: video.snippet.thumbnails.high.url,
            url: `https://www.youtube.com/watch?v=${video.id.videoId}`
          });
        }
      } else {
        // Fallback: Open YouTube search in browser
        setYoutubeVideo({
          id: null,
          title: exerciseName,
          thumbnail: null,
          url: searchUrl,
          isSearch: true
        });
      }
    } catch (error) {
      console.log('YouTube search error:', error);
      // Fallback to search URL
      const query = encodeURIComponent(`${exerciseName} exercise tutorial`);
      setYoutubeVideo({
        id: null,
        title: exerciseName,
        thumbnail: null,
        url: `https://www.youtube.com/results?search_query=${query}`,
        isSearch: true
      });
    } finally {
      setLoadingVideo(false);
    }
  };

  // Search exercises from API Ninjas
  const searchExercises = async (query) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    // Check if API key is configured
    if (!isAPIKeyConfigured()) {
      Alert.alert(
        'API Key Required',
        'Please configure your API Ninjas key in exerciseAPI.js to use exercise search.'
      );
      return;
    }

    setSearching(true);
    try {
      const data = await searchExercisesByName(query);
      setSearchResults(data.slice(0, 10)); // Limit to 10 results
    } catch (error) {
      console.error('Exercise search error:', error);
      Alert.alert('Error', 'Failed to search exercises. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        searchExercises(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const selectExercise = (exercise) => {
    setSelectedExercise(exercise);
    setFormData((prev) => ({
      ...prev,
      exercise: exercise.name,
      type: exercise.type,
    }));
    setSearchQuery('');
    setSearchResults([]);
    
    // Search for YouTube video demonstration
    searchYoutubeVideo(exercise.name);
  };

  const clearExercise = () => {
    setSelectedExercise(null);
    setYoutubeVideo(null);
    setFormData((prev) => ({
      ...prev,
      exercise: '',
      type: 'general',
    }));
    setSets([{ id: 1, reps: '', weight: '' }]);
  };

  const updateField = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  // Set management functions
  const addSet = () => {
    const newId = sets.length > 0 ? Math.max(...sets.map((s) => s.id)) + 1 : 1;
    const lastSet = sets[sets.length - 1];
    setSets([
      ...sets,
      {
        id: newId,
        reps: lastSet?.reps || '',
        weight: lastSet?.weight || '',
      },
    ]);
  };

  const removeSet = (id) => {
    if (sets.length > 1) {
      setSets(sets.filter((set) => set.id !== id));
    }
  };

  const updateSet = (id, field, value) => {
    setSets(sets.map((set) => (set.id === id ? { ...set, [field]: value } : set)));
  };

  const duplicateSet = (id) => {
    const setToDuplicate = sets.find((s) => s.id === id);
    if (setToDuplicate) {
      const newId = Math.max(...sets.map((s) => s.id)) + 1;
      const setIndex = sets.findIndex((s) => s.id === id);
      const newSets = [...sets];
      newSets.splice(setIndex + 1, 0, {
        id: newId,
        reps: setToDuplicate.reps,
        weight: setToDuplicate.weight,
      });
      setSets(newSets);
    }
  };

  // Conversion functions
  const kgToLbs = (kg) => (kg * 2.20462).toFixed(1);
  const lbsToKg = (lbs) => (lbs / 2.20462).toFixed(1);

  const convertWeight = (value, fromUnit) => {
    if (!value || value === '0') return '0';
    return fromUnit === 'kg' ? kgToLbs(parseFloat(value)) : lbsToKg(parseFloat(value));
  };

  const toggleWeightUnit = () => {
    const newUnit = weightUnit === 'kg' ? 'lbs' : 'kg';
    setSets(
      sets.map((set) => ({
        ...set,
        weight: set.weight ? convertWeight(set.weight, weightUnit) : '',
      }))
    );
    setWeightUnit(newUnit);
  };

  const validateForm = () => {
    if (!formData.exercise.trim()) return Alert.alert('Error', 'Please enter an exercise name');
    if (!formData.duration.trim()) return Alert.alert('Error', 'Please enter workout duration');
    const duration = parseInt(formData.duration);
    if (isNaN(duration) || duration <= 0) return Alert.alert('Error', 'Please enter a valid duration');
    return true;
  };

  const saveWorkout = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      const isStrength = selectedExercise?.type === 'strength' || selectedExercise?.type === 'powerlifting' || selectedExercise?.type === 'olympic_weightlifting';
      
      let setsData = null;
      if (isStrength && sets.length > 0) {
        setsData = sets
          .filter((set) => set.reps && set.weight)
          .map((set) => ({
            reps: parseInt(set.reps),
            weight: parseFloat(set.weight),
            unit: weightUnit,
          }));
      }

      const workoutData = {
        userId: auth.currentUser.uid,
        exercise: formData.exercise.trim(),
        duration: parseInt(formData.duration),
        notes: formData.notes.trim(),
        type: formData.type,
        sets: setsData,
        totalSets: setsData ? setsData.length : 0,
        muscle: selectedExercise?.muscle || null,
        difficulty: selectedExercise?.difficulty || null,
        equipment: selectedExercise?.equipment || null,
        instructions: selectedExercise?.instructions || null,
        createdAt: new Date(),
        date: new Date().toDateString(),
      };

      await addDoc(collection(db, 'workouts'), workoutData);
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { totalWorkouts: increment(1) });
      
      try {
        await recordWorkoutGamification(auth.currentUser.uid, workoutData, new Date());
      } catch (e) {
        console.log('Gamification (workout) error:', e);
      }

      Alert.alert('Success', 'Workout logged successfully!', [
        { text: 'OK', onPress: () => navigation.navigate('Workout') },
      ]);
    } catch (error) {
      Alert.alert('Error', `Failed to log workout: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderSearchResults = () => {
    if (!searchQuery.trim() || searchQuery.length < 2) return null;

    return (
      <View style={[styles.searchResults, { backgroundColor: colors.cardBackground }]}>
        {searching ? (
          <View style={styles.searchLoading}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={[styles.searchLoadingText, { color: colors.text }]}>
              Searching exercises...
            </Text>
          </View>
        ) : searchResults.length > 0 ? (
          <ScrollView 
            style={styles.searchResultsList}
            nestedScrollEnabled
            showsVerticalScrollIndicator={true}
          >
            {searchResults.map((item, index) => (
              <TouchableOpacity
                key={`${item.name}-${index}`}
                style={[
                  styles.searchResultItem,
                  { 
                    backgroundColor: colors.cardBackground,
                    borderBottomColor: colors.border 
                  },
                  index === searchResults.length - 1 && styles.searchResultItemLast
                ]}
                onPress={() => selectExercise(item)}
                activeOpacity={0.6}
              >
                <View style={styles.searchResultLeft}>
                  <Text style={[styles.searchResultName, { color: colors.text }]}>
                    {item.name}
                  </Text>
                  <View style={styles.searchResultMeta}>
                    <View
                      style={[
                        styles.searchResultBadge,
                        { backgroundColor: getTypeColor(item.type) + '20' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.searchResultBadgeText,
                          { color: getTypeColor(item.type) },
                        ]}
                      >
                        {item.type}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.searchResultBadge,
                        { backgroundColor: getDifficultyColor(item.difficulty) + '20' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.searchResultBadgeText,
                          { color: getDifficultyColor(item.difficulty) },
                        ]}
                      >
                        {item.difficulty}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="body-outline" size={14} color={colors.subtext} />
                    <Text style={[styles.searchResultMuscle, { color: colors.subtext }]}>
                      {item.muscle}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.noResults}>
            <Ionicons name="search-outline" size={32} color={colors.subtext} />
            <Text style={[styles.noResultsText, { color: colors.subtext }]}>
              No exercises found for "{searchQuery}"
            </Text>
          </View>
        )}
      </View>
    );
  };

  const openYoutubeVideo = async () => {
    if (!youtubeVideo) return;
    
    try {
      const canOpen = await Linking.canOpenURL(youtubeVideo.url);
      if (canOpen) {
        await Linking.openURL(youtubeVideo.url);
      } else {
        Alert.alert('Error', 'Unable to open YouTube');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open video');
    }
  };

  const renderExerciseInfo = () => {
    if (!selectedExercise) return null;

    return (
      <View style={[styles.exerciseCard, { 
        backgroundColor: colors.cardBackground, 
        borderColor: colors.border,
        shadowColor: theme === 'light' ? '#000' : '#fff',
      }]}>
        <View style={styles.exerciseCardHeader}>
          <View style={styles.exerciseTitleRow}>
            <Ionicons name="barbell-outline" size={20} color={colors.accent} />
            <Text style={[styles.exerciseCardTitle, { color: colors.text }]}>
              Exercise Details
            </Text>
          </View>
          <View
            style={[
              styles.typeBadge,
              { backgroundColor: getTypeColor(selectedExercise.type) },
            ]}
          >
            <Text style={styles.typeBadgeText}>{selectedExercise.type}</Text>
          </View>
        </View>

        {/* YouTube Video */}
        {loadingVideo ? (
          <View style={[styles.videoLoadingContainer, { backgroundColor: colors.inputBackground }]}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.videoLoadingText, { color: colors.text }]}>
              Finding video demonstration...
            </Text>
          </View>
        ) : youtubeVideo ? (
          <TouchableOpacity 
            style={styles.videoContainer}
            onPress={openYoutubeVideo}
            activeOpacity={0.8}
          >
            {youtubeVideo.thumbnail ? (
              <>
                <Image
                  source={{ uri: youtubeVideo.thumbnail }}
                  style={styles.videoThumbnail}
                  resizeMode="cover"
                />
                <View style={styles.playOverlay}>
                  <View style={styles.playButton}>
                    <Ionicons name="play" size={40} color="#fff" />
                  </View>
                </View>
              </>
            ) : (
              <View style={[styles.videoPlaceholder, { backgroundColor: colors.inputBackground }]}>
                <Ionicons name="logo-youtube" size={48} color="#FF0000" />
                <Text style={[styles.videoPlaceholderText, { color: colors.text }]}>
                  {youtubeVideo.isSearch ? 'Search on YouTube' : 'Watch Tutorial'}
                </Text>
              </View>
            )}
            <View style={[styles.videoInfo, { backgroundColor: colors.background }]}>
              <Ionicons name="logo-youtube" size={16} color="#FF0000" />
              <Text style={[styles.videoTitle, { color: colors.text }]} numberOfLines={2}>
                {youtubeVideo.title}
              </Text>
            </View>
          </TouchableOpacity>
        ) : null}

        {/* Exercise Metadata */}
        <View style={styles.exerciseMetadata}>
          <View style={styles.metadataItem}>
            <Ionicons name="body-outline" size={18} color={colors.accent} />
            <Text style={[styles.metadataText, { color: colors.text }]}>
              {selectedExercise.muscle.replace(/_/g, ' ')}
            </Text>
          </View>
          <View style={styles.metadataItem}>
            <Ionicons name="speedometer-outline" size={18} color={getDifficultyColor(selectedExercise.difficulty)} />
            <Text style={[styles.metadataText, { color: colors.text }]}>
              {selectedExercise.difficulty}
            </Text>
          </View>
          {selectedExercise.equipment && (
            <View style={styles.metadataItem}>
              <Ionicons name="barbell-outline" size={18} color={colors.accent} />
              <Text style={[styles.metadataText, { color: colors.text }]}>
                {selectedExercise.equipment}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.changeExerciseButton, { 
            backgroundColor: colors.danger + '15',
            borderColor: colors.border
          }]}
          onPress={clearExercise}
          activeOpacity={0.7}
        >
          <Ionicons name="swap-horizontal" size={18} color={colors.danger} />
          <Text style={[styles.changeExerciseButtonText, { color: colors.danger }]}>
            Change Exercise
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderStrengthSets = () => {
    if (!selectedExercise) return null;
    if (
      selectedExercise.type !== 'strength' &&
      selectedExercise.type !== 'powerlifting' &&
      selectedExercise.type !== 'olympic_weightlifting'
    ) {
      return null;
    }

    const totalReps = sets.reduce((sum, set) => sum + (parseInt(set.reps) || 0), 0);
    const totalVolume = sets.reduce(
      (sum, set) => sum + (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0),
      0
    );

    return (
      <View style={[styles.exerciseCard, { 
        backgroundColor: colors.cardBackground, 
        borderColor: colors.border,
        shadowColor: theme === 'light' ? '#000' : '#fff',
      }]}>
        <View style={styles.exerciseCardHeader}>
          <View style={styles.exerciseTitleRow}>
            <Ionicons name="barbell" size={20} color={colors.accent} />
            <Text style={[styles.exerciseCardTitle, { color: colors.text }]}>Sets & Reps</Text>
          </View>
          <TouchableOpacity 
            style={[styles.unitToggle, { 
              backgroundColor: colors.accent + '15',
              borderColor: colors.accent 
            }]} 
            onPress={toggleWeightUnit}
            activeOpacity={0.7}
          >
            <Ionicons name="swap-horizontal" size={14} color={colors.accent} />
            <Text style={[styles.unitToggleText, { color: colors.accent }]}>{weightUnit}</Text>
          </TouchableOpacity>
        </View>

        {sets.map((set, index) => (
          <View
            key={set.id}
            style={[
              styles.setRow,
              { backgroundColor: colors.inputBackground, borderColor: colors.border },
            ]}
          >
            <View style={[styles.setNumber, { backgroundColor: colors.accent + '15' }]}>
              <Text style={[styles.setNumberText, { color: colors.accent }]}>{index + 1}</Text>
            </View>
            <View style={styles.setInputs}>
              <View style={styles.setInputGroup}>
                <Text style={[styles.setInputLabel, { color: colors.subtext }]}>Reps</Text>
                <TextInput
                  style={[
                    styles.setInput,
                    {
                      backgroundColor: colors.cardBackground,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={set.reps}
                  onChangeText={(value) => updateSet(set.id, 'reps', value)}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={colors.placeholderText}
                />
              </View>
              <View style={styles.setInputGroup}>
                <Text style={[styles.setInputLabel, { color: colors.subtext }]}>
                  {weightUnit}
                </Text>
                <TextInput
                  style={[
                    styles.setInput,
                    {
                      backgroundColor: colors.cardBackground,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={set.weight}
                  onChangeText={(value) => updateSet(set.id, 'weight', value)}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.placeholderText}
                />
              </View>
            </View>
            <View style={styles.setActions}>
              <TouchableOpacity
                style={[styles.setActionButton, { backgroundColor: colors.accent + '15' }]}
                onPress={() => duplicateSet(set.id)}
                activeOpacity={0.7}
              >
                <Ionicons name="duplicate-outline" size={18} color={colors.accent} />
              </TouchableOpacity>
              {sets.length > 1 && (
                <TouchableOpacity
                  style={[styles.setActionButton, { backgroundColor: colors.danger + '15' }]}
                  onPress={() => removeSet(set.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={[styles.addSetButton, { borderColor: colors.accent }]}
          onPress={addSet}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle-outline" size={24} color={colors.accent} />
          <Text style={[styles.addSetButtonText, { color: colors.accent }]}>Add Set</Text>
        </TouchableOpacity>

        {sets.some((s) => s.reps && s.weight) && (
          <View style={[styles.setSummary, { 
            backgroundColor: colors.accent + '10', 
            borderColor: colors.accent + '30'
          }]}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.accent }]}>
                Total Sets
              </Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{sets.length}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.accent }]}>
                Total Reps
              </Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{totalReps}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.accent }]}>
                Total Volume
              </Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {totalVolume.toFixed(1)} {weightUnit}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { 
        backgroundColor: colors.cardBackground,
        shadowColor: theme === 'light' ? '#000' : '#fff',
      }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Add Workout</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Exercise Search */}
          <View style={[styles.exerciseCard, { 
            backgroundColor: colors.cardBackground,
            borderColor: colors.border,
            shadowColor: theme === 'light' ? '#000' : '#fff',
          }]}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>
              Exercise <Text style={{ color: colors.danger }}>*</Text>
            </Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
              <Ionicons name="fitness" size={20} color={colors.subtext} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder={selectedExercise ? selectedExercise.name : "Search for an exercise..."}
                placeholderTextColor={colors.placeholderText}
                value={searchQuery}
                onChangeText={setSearchQuery}
                editable={!selectedExercise}
              />
              {(searchQuery || selectedExercise) && (
                <TouchableOpacity onPress={() => {
                  setSearchQuery('');
                  if (selectedExercise) clearExercise();
                }} activeOpacity={0.7}>
                  <Ionicons name="close-circle" size={20} color={colors.subtext} />
                </TouchableOpacity>
              )}
            </View>
            {renderSearchResults()}
          </View>

          {/* Exercise Info with YouTube Video */}
          {renderExerciseInfo()}

          {/* Strength Sets */}
          {renderStrengthSets()}

          {/* Duration */}
          <View style={[styles.exerciseCard, { 
            backgroundColor: colors.cardBackground,
            borderColor: colors.border,
            shadowColor: theme === 'light' ? '#000' : '#fff',
          }]}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>
              Duration (minutes) <Text style={{ color: colors.danger }}>*</Text>
            </Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
              <Ionicons name="time" size={20} color={colors.subtext} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="e.g., 30"
                placeholderTextColor={colors.placeholderText}
                value={formData.duration}
                onChangeText={(value) => updateField('duration', value)}
                keyboardType="number-pad"
              />
            </View>
          </View>

          {/* Notes */}
          <View style={[styles.exerciseCard, { 
            backgroundColor: colors.cardBackground,
            borderColor: colors.border,
            shadowColor: theme === 'light' ? '#000' : '#fff',
          }]}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Notes (optional)</Text>
            <View style={[styles.textAreaContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
              <TextInput
                style={[styles.textArea, { color: colors.text }]}
                placeholder="Add any notes about your workout..."
                placeholderTextColor={colors.placeholderText}
                value={formData.notes}
                onChangeText={(value) => updateField('notes', value)}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, { 
              backgroundColor: colors.accent,
              shadowColor: colors.accent,
            }]}
            onPress={saveWorkout}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Log Workout</Text>
              </>
            )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  exerciseCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  exerciseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  exerciseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  exerciseCardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 12,
    minHeight: 50,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  textAreaContainer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    minHeight: 100,
  },
  textArea: {
    fontSize: 16,
    fontWeight: '500',
    minHeight: 80,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  statusText: {
    fontSize: 14,
    flex: 1,
  },
  searchResults: {
    marginTop: 12,
    borderRadius: 12,
    maxHeight: 280,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  searchResultsList: {
    maxHeight: 280,
  },
  searchLoading: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  searchLoadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    minHeight: 68,
  },
  searchResultItemLast: {
    borderBottomWidth: 0,
  },
  searchResultLeft: {
    flex: 1,
    gap: 6,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'capitalize',
    lineHeight: 22,
  },
  searchResultMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  searchResultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  searchResultBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  searchResultMuscle: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  noResults: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  noResultsText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  // YouTube Video Styles
  videoLoadingContainer: {
    height: 200,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  videoLoadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  videoContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  videoThumbnail: {
    width: '100%',
    height: 200,
    backgroundColor: '#000',
  },
  videoPlaceholder: {
    width: '100%',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  videoPlaceholderText: {
    fontSize: 16,
    fontWeight: '600',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  playButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoInfo: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  videoTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    lineHeight: 20,
  },
  exerciseMetadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metadataText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  changeExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginTop: 4,
    borderWidth: 1,
    minHeight: 44,
  },
  changeExerciseButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Sets and Reps Styles
  unitToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  unitToggleText: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    gap: 12,
  },
  setNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  setNumberText: {
    fontSize: 16,
    fontWeight: '700',
  },
  setInputs: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  setInputGroup: {
    flex: 1,
  },
  setInputLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  setInput: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 16,
    fontWeight: '600',
    borderWidth: 1,
    textAlign: 'center',
    minHeight: 44,
  },
  setActions: {
    flexDirection: 'row',
    gap: 6,
  },
  setActionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    marginTop: 8,
    minHeight: 56,
  },
  addSetButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  setSummary: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 18,
    borderRadius: 16,
    marginTop: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    minHeight: 60,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});

export default AddWorkoutScreen;