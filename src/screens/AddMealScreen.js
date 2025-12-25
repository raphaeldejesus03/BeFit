import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { searchFoods } from '../services/foodApi';
import { useTheme } from './ThemeContext';
import { lightTheme, darkTheme } from './themes';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

// Helper function to create initial empty food state
const getInitialFoodState = () => ({
  id: Date.now() + Math.random(), // Add random to ensure uniqueness
  name: '', 
  calories: '', 
  protein: 0, 
  carbs: 0, 
  fat: 0,
  servingSize: 100,
  servingUnit: 'g',
  baseServingSize: 100,
  baseCalories: '',
  baseProtein: 0,
  baseCarbs: 0,
  baseFat: 0
});

// Move FoodInput outside to prevent recreation
const FoodInput = React.memo(({ 
  food, 
  index, 
  colors, 
  theme,
  foodsLength,
  onNameChange, 
  onCaloriesChange, 
  onMacroChange, 
  onRemove,
  onSelectSuggestion,
  suggestions,
  loadingSuggestions,
  onServingSizeChange,
  onServingUnitChange
}) => {
  console.log('🟢 FoodInput rendered for food:', food.id);

  const servingUnits = ['g', 'oz', 'lb', 'cup', 'tbsp', 'piece'];

  return (
    <View style={[styles.foodCard, { 
      backgroundColor: colors.cardBackground, 
      borderColor: colors.border,
      shadowColor: theme === 'light' ? '#000' : '#fff',
    }]}>
      <View style={styles.foodCardHeader}>
        <View style={styles.foodCardTitleRow}>
          <Ionicons name="restaurant-outline" size={20} color={colors.accent} />
          <Text style={[styles.foodCardTitle, { color: colors.text }]}>
            Food Item {foodsLength > 1 ? `#${index + 1}` : ''}
          </Text>
        </View>
        {foodsLength > 1 && (
          <TouchableOpacity 
            onPress={() => onRemove(food.id)}
            style={[styles.removeButton, { backgroundColor: colors.danger + '15' }]}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.text }]}>
          Food Name <Text style={{ color: colors.danger }}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, { 
            backgroundColor: colors.inputBackground, 
            borderColor: colors.border, 
            color: colors.text 
          }]}
          value={food.name}
          onChangeText={(text) => onNameChange(text, food.id)}
          placeholder="e.g., Grilled chicken breast"
          placeholderTextColor={colors.placeholderText}
        />
      </View>

      {loadingSuggestions && (
        <View style={[styles.statusContainer, { backgroundColor: colors.accent + '10' }]}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={[styles.statusText, { color: colors.accent }]}>Searching foods...</Text>
        </View>
      )}

      {!loadingSuggestions && suggestions.length === 0 && food.name.length >= 2 && (
        <View style={[styles.statusContainer, { backgroundColor: colors.warning + '10' }]}>
          <Ionicons name="information-circle-outline" size={16} color={colors.subtext} />
          <Text style={[styles.statusText, { color: colors.subtext }]}>
            No results. Try different keywords or enter manually.
          </Text>
        </View>
      )}

      {suggestions.length > 0 && (
        <View style={styles.suggestionsWrapper}>
          <Text style={[styles.suggestionsHeader, { color: colors.accent }]}>
            <Ionicons name="search-outline" size={14} color={colors.accent} /> Suggested Foods
          </Text>
          <ScrollView 
            style={[styles.suggestionsBox, { 
              backgroundColor: colors.background,
              borderColor: colors.border 
            }]} 
            nestedScrollEnabled 
            showsVerticalScrollIndicator={true}
          >
            {suggestions.map((item, i) => (
              <TouchableOpacity
                key={`suggestion-${food.id}-${i}`}
                style={[
                  styles.suggestionItem,
                  { 
                    backgroundColor: colors.cardBackground,
                    borderBottomColor: colors.border 
                  },
                  i === suggestions.length - 1 && styles.suggestionItemLast
                ]}
                onPress={() => onSelectSuggestion(item, food.id)}
                activeOpacity={0.6}
              >
                <View style={styles.suggestionContent}>
                  <Text style={[styles.suggestionName, { color: colors.text }]} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <View style={styles.suggestionMacrosContainer}>
                    <View style={[styles.macroChip, { backgroundColor: colors.accent + '15' }]}>
                      <Text style={[styles.macroChipLabel, { color: colors.accent }]}>Cal</Text>
                      <Text style={[styles.macroChipValue, { color: colors.text }]}>
                        {item.calories}
                      </Text>
                    </View>
                    <View style={[styles.macroChip, { backgroundColor: colors.inputBackground }]}>
                      <Text style={[styles.macroChipLabel, { color: colors.subtext }]}>P</Text>
                      <Text style={[styles.macroChipValue, { color: colors.text }]}>
                        {item.protein}g
                      </Text>
                    </View>
                    <View style={[styles.macroChip, { backgroundColor: colors.inputBackground }]}>
                      <Text style={[styles.macroChipLabel, { color: colors.subtext }]}>C</Text>
                      <Text style={[styles.macroChipValue, { color: colors.text }]}>
                        {item.carbs}g
                      </Text>
                    </View>
                    <View style={[styles.macroChip, { backgroundColor: colors.inputBackground }]}>
                      <Text style={[styles.macroChipLabel, { color: colors.subtext }]}>F</Text>
                      <Text style={[styles.macroChipValue, { color: colors.text }]}>
                        {item.fat}g
                      </Text>
                    </View>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Serving Size Control */}
      {food.baseCalories && (
        <View style={[styles.servingSizeCard, { 
          backgroundColor: colors.accent + '10',
          borderColor: colors.accent + '30'
        }]}>
          <View style={styles.servingSizeHeader}>
            <Ionicons name="scale-outline" size={18} color={colors.accent} />
            <Text style={[styles.servingSizeTitle, { color: colors.accent }]}>
              Serving Size
            </Text>
          </View>
          
          <View style={styles.servingSizeControls}>
            <View style={styles.servingSizeInputGroup}>
              <TextInput
                style={[styles.servingSizeInput, { 
                  backgroundColor: colors.inputBackground, 
                  borderColor: colors.border, 
                  color: colors.text 
                }]}
                value={food.servingSize.toString()}
                onChangeText={(text) => onServingSizeChange(text, food.id)}
                placeholder="1"
                placeholderTextColor={colors.placeholderText}
                keyboardType="decimal-pad"
              />
              
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.unitSelector}
              >
                {servingUnits.map((unit) => (
                  <TouchableOpacity
                    key={unit}
                    style={[
                      styles.unitButton,
                      {
                        backgroundColor: food.servingUnit === unit 
                          ? colors.accent 
                          : colors.inputBackground,
                        borderColor: food.servingUnit === unit 
                          ? colors.accent 
                          : colors.border
                      }
                    ]}
                    onPress={() => onServingUnitChange(unit, food.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.unitButtonText,
                      {
                        color: food.servingUnit === unit 
                          ? '#fff' 
                          : colors.text
                      }
                    ]}>
                      {unit}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
          
          <View style={[styles.servingSizeInfo, { backgroundColor: colors.inputBackground }]}>
            <Text style={[styles.servingSizeInfoText, { color: colors.subtext }]}>
              <Ionicons name="information-circle-outline" size={14} color={colors.subtext} />
              {' '}Base: {food.baseCalories} cal per {food.baseServingSize}g
            </Text>
          </View>
        </View>
      )}

      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.text }]}>
          Calories <Text style={{ color: colors.danger }}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, { 
            backgroundColor: colors.inputBackground, 
            borderColor: colors.border, 
            color: colors.text 
          }]}
          value={food.calories}
          onChangeText={(text) => onCaloriesChange(text, food.id)}
          placeholder="e.g., 200"
          placeholderTextColor={colors.placeholderText}
          keyboardType="numeric"
        />
      </View>

      <Text style={[styles.sectionLabel, { color: colors.text }]}>
        Macronutrients (Optional)
      </Text>
      <View style={styles.macrosContainer}>
        <View style={styles.macroInput}>
          <Text style={[styles.macroLabel, { color: colors.subtext }]}>Protein (g)</Text>
          <TextInput
            style={[styles.smallInput, { 
              backgroundColor: colors.inputBackground, 
              borderColor: colors.border, 
              color: colors.text 
            }]}
            value={food.protein.toString()}
            onChangeText={(text) => onMacroChange('protein', text, food.id)}
            placeholder="0"
            placeholderTextColor={colors.placeholderText}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.macroInput}>
          <Text style={[styles.macroLabel, { color: colors.subtext }]}>Carbs (g)</Text>
          <TextInput
            style={[styles.smallInput, { 
              backgroundColor: colors.inputBackground, 
              borderColor: colors.border, 
              color: colors.text 
            }]}
            value={food.carbs.toString()}
            onChangeText={(text) => onMacroChange('carbs', text, food.id)}
            placeholder="0"
            placeholderTextColor={colors.placeholderText}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.macroInput}>
          <Text style={[styles.macroLabel, { color: colors.subtext }]}>Fat (g)</Text>
          <TextInput
            style={[styles.smallInput, { 
              backgroundColor: colors.inputBackground, 
              borderColor: colors.border, 
              color: colors.text 
            }]}
            value={food.fat.toString()}
            onChangeText={(text) => onMacroChange('fat', text, food.id)}
            placeholder="0"
            placeholderTextColor={colors.placeholderText}
            keyboardType="numeric"
          />
        </View>
      </View>
    </View>
  );
});

const AddMealScreen = ({ navigation, route }) => {
  const { mealType = 'Breakfast', meal = null, isEditing = false } = route.params || {};

  const [foods, setFoods] = useState([getInitialFoodState()]);
  const [loading, setLoading] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState({});
  const [searchLoading, setSearchLoading] = useState({});
  const searchTimeouts = useRef({});
  
  const themeContext = useTheme();
  const theme = themeContext?.theme || 'light';
  
  const colors = useMemo(() => {
    return (theme === 'light' ? lightTheme : darkTheme) || {
      accent: '#6366F1',
      text: '#333',
      background: '#f5f5f5',
      cardBackground: '#ffffff',
      inputBackground: '#f8f8f8',
      border: '#e0e0e0',
      placeholderText: '#999',
      subtext: '#666',
      danger: '#EF4444',
      warning: '#FF9500'
    };
  }, [theme]);

  // Reset form when navigating back to this screen (not editing)
  useFocusEffect(
    React.useCallback(() => {
      // Only reset if NOT editing
      if (!isEditing) {
        setFoods([getInitialFoodState()]);
        setSearchSuggestions({});
        setSearchLoading({});
        // Clear any pending search timeouts
        Object.values(searchTimeouts.current).forEach(timeout => {
          if (timeout) clearTimeout(timeout);
        });
        searchTimeouts.current = {};
      }
    }, [isEditing])
  );

  useEffect(() => {
    if (isEditing && meal) {
      setFoods(meal.foods.map(f => ({
        id: Date.now() + Math.random(),
        name: f.name,
        calories: f.calories.toString(),
        protein: f.protein || 0,
        carbs: f.carbs || 0,
        fat: f.fat || 0
      })));
    }
  }, [isEditing, meal]);

  const addFoodField = useCallback(() => {
    setFoods(prev => [...prev, getInitialFoodState()]);
  }, []);
  
  const removeFoodField = useCallback((id) => {
    setFoods(prev => prev.length > 1 ? prev.filter((food) => food.id !== id) : prev);
  }, []);

  const performSearch = useCallback(async (text, id) => {
    const trimmedText = text?.trim();
    if (!trimmedText || trimmedText.length < 2 || !/[a-zA-Z0-9]/.test(trimmedText)) {
      setSearchSuggestions(prev => ({ ...prev, [id]: [] }));
      setSearchLoading(prev => ({ ...prev, [id]: false }));
      return;
    }
    
    setSearchLoading(prev => ({ ...prev, [id]: true }));
    try {
      const results = await searchFoods(trimmedText);
      setSearchSuggestions(prev => ({ ...prev, [id]: results || [] }));
    } catch (error) {
      console.error('Search error:', error);
      setSearchSuggestions(prev => ({ ...prev, [id]: [] }));
    } finally {
      setSearchLoading(prev => ({ ...prev, [id]: false }));
    }
  }, []);

  const handleFoodNameChange = useCallback((text, id) => {
    setFoods(prevFoods => 
      prevFoods.map((food) => 
        food.id === id ? { ...food, name: text } : food
      )
    );
    
    if (searchTimeouts.current[id]) {
      clearTimeout(searchTimeouts.current[id]);
    }
    
    const trimmedText = text?.trim();
    if (trimmedText && trimmedText.length >= 2 && /[a-zA-Z0-9]/.test(trimmedText)) {
      searchTimeouts.current[id] = setTimeout(() => {
        performSearch(text, id);
      }, 400);
    } else {
      setSearchSuggestions(prev => ({ ...prev, [id]: [] }));
      setSearchLoading(prev => ({ ...prev, [id]: false }));
    }
  }, [performSearch]);

  const handleCaloriesChange = useCallback((text, id) => {
    setFoods(prevFoods => 
      prevFoods.map((f) => 
        f.id === id ? { ...f, calories: text } : f
      )
    );
  }, []);

  const handleMacroChange = useCallback((field, text, id) => {
    setFoods(prevFoods => 
      prevFoods.map((f) => 
        f.id === id ? { ...f, [field]: parseFloat(text) || 0 } : f
      )
    );
  }, []);

  const handleSelectSuggestion = useCallback((item, foodId) => {
    setFoods(prevFoods => 
      prevFoods.map((f) => 
        f.id === foodId ? {
          ...f,
          name: item.name,
          calories: item.calories.toString(),
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          // Set base values for serving size calculations (API data is per 100g)
          baseCalories: item.calories.toString(),
          baseProtein: item.protein,
          baseCarbs: item.carbs,
          baseFat: item.fat,
          baseServingSize: 100, // API nutrition data is per 100g
          servingSize: 100,
          servingUnit: 'g'
        } : f
      )
    );
    
    setSearchSuggestions(prev => ({ ...prev, [foodId]: [] }));
  }, []);

  // Serving size management functions
  const handleServingSizeChange = useCallback((text, id) => {
    const newSize = parseFloat(text) || 0;
    if (newSize < 0) return;
    
    setFoods(prevFoods =>
      prevFoods.map((f) => {
        if (f.id !== id) return f;
        
        const baseCalories = parseFloat(f.baseCalories) || 0;
        const baseServingSize = f.baseServingSize || 100;
        
        // Calculate ratio: newSize / baseServingSize
        // Example: 200g / 100g = 2.0 (double the nutrients)
        const ratio = newSize / baseServingSize;
        
        return {
          ...f,
          servingSize: text, // Keep as string for input
          calories: baseCalories ? Math.round(baseCalories * ratio).toString() : f.calories,
          protein: f.baseProtein ? Math.round(f.baseProtein * ratio * 10) / 10 : f.protein,
          carbs: f.baseCarbs ? Math.round(f.baseCarbs * ratio * 10) / 10 : f.carbs,
          fat: f.baseFat ? Math.round(f.baseFat * ratio * 10) / 10 : f.fat
        };
      })
    );
  }, []);

  const handleServingUnitChange = useCallback((unit, id) => {
    setFoods(prevFoods =>
      prevFoods.map((f) => 
        f.id === id ? { ...f, servingUnit: unit } : f
      )
    );
  }, []);

  // Update base values when manual entry changes
  const handleManualCaloriesChange = useCallback((text, id) => {
    setFoods(prevFoods => 
      prevFoods.map((f) => {
        if (f.id !== id) return f;
        
        // If this is the first time entering calories or servingSize equals baseServingSize, set it as base
        const shouldSetBase = !f.baseCalories || f.servingSize == f.baseServingSize;
        
        return {
          ...f,
          calories: text,
          baseCalories: shouldSetBase ? text : f.baseCalories
        };
      })
    );
  }, []);

  const handleManualMacroChange = useCallback((field, text, id) => {
    const value = parseFloat(text) || 0;
    const baseField = `base${field.charAt(0).toUpperCase() + field.slice(1)}`;
    
    setFoods(prevFoods => 
      prevFoods.map((f) => {
        if (f.id !== id) return f;
        
        // If serving size equals base serving size, update base value too
        const shouldSetBase = f.servingSize == f.baseServingSize;
        
        return {
          ...f,
          [field]: value,
          [baseField]: shouldSetBase ? value : f[baseField]
        };
      })
    );
  }, []);

  useEffect(() => {
    return () => {
      Object.values(searchTimeouts.current).forEach(timeout => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, []);

  const saveMeal = async () => {
    const validFoods = foods.filter(food => food.name.trim() && food.calories);
    if (validFoods.length === 0) {
      return Alert.alert('Missing Information', 'Please add at least one food item with calories');
    }

    for (let food of validFoods) {
      if (isNaN(food.calories) || parseInt(food.calories) < 0) {
        return Alert.alert('Invalid Input', `Please enter a valid calorie value for ${food.name}`);
      }
    }

    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const nutritionDocRef = doc(db, 'nutrition', `${auth.currentUser.uid}_${today}`);
      const nutritionDoc = await getDoc(nutritionDocRef);
      const existingData = nutritionDoc.exists() ? nutritionDoc.data() : {
        meals: [],
        totalCalories: 0,
        nutrients: { protein: 0, carbs: 0, fat: 0, fiber: 0 }
      };

      const mealCalories = validFoods.reduce((sum, f) => sum + parseInt(f.calories), 0);
      const mealProtein = validFoods.reduce((sum, f) => sum + (f.protein || 0), 0);
      const mealCarbs = validFoods.reduce((sum, f) => sum + (f.carbs || 0), 0);
      const mealFat = validFoods.reduce((sum, f) => sum + (f.fat || 0), 0);

      const newMeal = {
        type: mealType,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        foods: validFoods.map(f => ({
          name: f.name.trim(),
          calories: parseInt(f.calories),
          protein: f.protein,
          carbs: f.carbs,
          fat: f.fat
        })),
        calories: mealCalories
      };

      let updatedMeals;
      let updatedTotals = {
        totalCalories: existingData.totalCalories,
        protein: existingData.nutrients.protein,
        carbs: existingData.nutrients.carbs,
        fat: existingData.nutrients.fat,
      };

      if (isEditing && meal) {
        updatedMeals = existingData.meals.map((m) =>
          m.type === meal.type && m.time === meal.time ? newMeal : m
        );

        const totals = updatedMeals.reduce(
          (acc, m) => ({
            totalCalories: acc.totalCalories + m.calories,
            protein: acc.protein + m.foods.reduce((s, f) => s + (f.protein || 0), 0),
            carbs: acc.carbs + m.foods.reduce((s, f) => s + (f.carbs || 0), 0),
            fat: acc.fat + m.foods.reduce((s, f) => s + (f.fat || 0), 0),
          }),
          { totalCalories: 0, protein: 0, carbs: 0, fat: 0 }
        );

        updatedTotals = totals;
      } else {
        updatedMeals = [...existingData.meals, newMeal];
        updatedTotals = {
          totalCalories: existingData.totalCalories + mealCalories,
          protein: existingData.nutrients.protein + mealProtein,
          carbs: existingData.nutrients.carbs + mealCarbs,
          fat: existingData.nutrients.fat + mealFat,
        };
      }

      const updatedData = {
        meals: updatedMeals,
        totalCalories: updatedTotals.totalCalories,
        nutrients: {
          protein: updatedTotals.protein,
          carbs: updatedTotals.carbs,
          fat: updatedTotals.fat,
          fiber: existingData.nutrients.fiber
        },
        date: today,
        userId: auth.currentUser.uid,
        updatedAt: new Date(),
      };

      await setDoc(nutritionDocRef, updatedData);

      Alert.alert('Success!', 'Meal logged successfully', [
        { text: 'OK', onPress: () => navigation.navigate('Nutrition') }
      ]);
    } catch (error) {
      console.error('Error saving meal:', error);
      Alert.alert('Error', `Failed to save meal: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const totalCalories = useMemo(() => 
    foods.reduce((sum, food) => sum + (parseInt(food.calories) || 0), 0), 
    [foods]
  );
  
  const totalProtein = useMemo(() => 
    foods.reduce((sum, food) => sum + (food.protein || 0), 0), 
    [foods]
  );
  
  const totalCarbs = useMemo(() => 
    foods.reduce((sum, food) => sum + (food.carbs || 0), 0), 
    [foods]
  );
  
  const totalFat = useMemo(() => 
    foods.reduce((sum, food) => sum + (food.fat || 0), 0), 
    [foods]
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.header, { 
          backgroundColor: colors.cardBackground, 
          borderBottomColor: colors.border 
        }]}>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Nutrition')} 
            style={styles.headerButton}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={28} color={colors.subtext} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isEditing ? 'Edit' : 'Add'} {mealType}
          </Text>
          <TouchableOpacity 
            onPress={saveMeal} 
            disabled={loading} 
            style={[styles.headerButton, styles.saveButtonContainer, { 
              backgroundColor: colors.accent,
              opacity: loading ? 0.6 : 1 
            }]}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={[styles.container, { backgroundColor: colors.background }]} 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
          <View style={styles.mealTypeContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              <Ionicons name="time-outline" size={18} color={colors.accent} /> Meal Type
            </Text>
            <View style={styles.mealTypeSelector}>
              {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.mealTypeButton,
                    { 
                      backgroundColor: mealType === type ? colors.accent : colors.cardBackground, 
                      borderColor: mealType === type ? colors.accent : colors.border,
                      shadowColor: theme === 'light' ? '#000' : '#fff',
                    },
                  ]}
                  onPress={() => navigation.setParams({ mealType: type })}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.mealTypeButtonText,
                    { color: mealType === type ? '#FFFFFF' : colors.text },
                  ]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {foods.map((food, index) => (
            <FoodInput 
              key={food.id} 
              food={food} 
              index={index}
              colors={colors}
              theme={theme}
              foodsLength={foods.length}
              onNameChange={handleFoodNameChange}
              onCaloriesChange={handleManualCaloriesChange}
              onMacroChange={handleManualMacroChange}
              onRemove={removeFoodField}
              onSelectSuggestion={handleSelectSuggestion}
              suggestions={searchSuggestions[food.id] || []}
              loadingSuggestions={searchLoading[food.id] || false}
              onServingSizeChange={handleServingSizeChange}
              onServingUnitChange={handleServingUnitChange}
            />
          ))}

          <TouchableOpacity 
            style={[styles.addFoodButton, { 
              backgroundColor: colors.accent + '10', 
              borderColor: colors.accent 
            }]} 
            onPress={addFoodField}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={24} color={colors.accent} />
            <Text style={[styles.addFoodButtonText, { color: colors.accent }]}>
              Add Another Food Item
            </Text>
          </TouchableOpacity>

          {totalCalories > 0 && (
            <View style={[styles.summaryCard, { 
              backgroundColor: colors.cardBackground,
              borderColor: colors.accent,
              shadowColor: theme === 'light' ? '#000' : '#fff',
            }]}>
              <View style={styles.summaryHeader}>
                <Ionicons name="calculator-outline" size={20} color={colors.accent} />
                <Text style={[styles.summaryTitle, { color: colors.text }]}>Meal Summary</Text>
              </View>
              
              <View style={[styles.totalCaloriesRow, { backgroundColor: colors.accent + '10' }]}>
                <Text style={[styles.totalLabel, { color: colors.text }]}>Total Calories</Text>
                <Text style={[styles.totalValue, { color: colors.accent }]}>
                  {totalCalories} cal
                </Text>
              </View>

              {(totalProtein > 0 || totalCarbs > 0 || totalFat > 0) && (
                <View style={styles.macrosSummary}>
                  {totalProtein > 0 && (
                    <View style={styles.macroSummaryItem}>
                      <Text style={[styles.macroSummaryLabel, { color: colors.subtext }]}>
                        Protein
                      </Text>
                      <Text style={[styles.macroSummaryValue, { color: colors.text }]}>
                        {totalProtein.toFixed(1)}g
                      </Text>
                    </View>
                  )}
                  {totalCarbs > 0 && (
                    <View style={styles.macroSummaryItem}>
                      <Text style={[styles.macroSummaryLabel, { color: colors.subtext }]}>
                        Carbs
                      </Text>
                      <Text style={[styles.macroSummaryValue, { color: colors.text }]}>
                        {totalCarbs.toFixed(1)}g
                      </Text>
                    </View>
                  )}
                  {totalFat > 0 && (
                    <View style={styles.macroSummaryItem}>
                      <Text style={[styles.macroSummaryLabel, { color: colors.subtext }]}>
                        Fat
                      </Text>
                      <Text style={[styles.macroSummaryValue, { color: colors.text }]}>
                        {totalFat.toFixed(1)}g
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  keyboardAvoid: { flex: 1 },
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonContainer: {
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  mealTypeContainer: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 12,
  },
  mealTypeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  mealTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  mealTypeButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  foodCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  foodCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  foodCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  foodCardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  removeButton: {
    padding: 8,
    borderRadius: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputGroup: { marginBottom: 16 },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1.5,
    minHeight: 50,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 14,
    flex: 1,
  },
  suggestionsWrapper: { marginBottom: 16 },
  suggestionsHeader: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  suggestionsBox: {
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: 280,
  },
  suggestionItem: {
    padding: 14,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 68,
  },
  suggestionItemLast: { borderBottomWidth: 0 },
  suggestionContent: {
    flex: 1,
    marginRight: 12,
  },
  suggestionName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 22,
  },
  suggestionMacrosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  macroChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  macroChipLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  macroChipValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  macrosContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  macroInput: { flex: 1 },
  macroLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  smallInput: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 15,
    borderWidth: 1.5,
    textAlign: 'center',
    minHeight: 44,
  },
  addFoodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    marginBottom: 20,
    minHeight: 56,
  },
  addFoodButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  summaryCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 20,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  totalCaloriesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 17,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  macrosSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
  },
  macroSummaryItem: { alignItems: 'center' },
  macroSummaryLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  macroSummaryValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  // Serving Size Styles
  servingSizeCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
  },
  servingSizeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  servingSizeTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  servingSizeControls: {
    marginBottom: 10,
  },
  servingSizeInputGroup: {
    gap: 10,
  },
  servingSizeInput: {
    fontSize: 18,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    textAlign: 'center',
  },
  unitSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  unitButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    marginRight: 8,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  servingSizeInfo: {
    padding: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  servingSizeInfoText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default AddMealScreen;