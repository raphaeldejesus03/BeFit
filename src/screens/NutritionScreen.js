// src/screens/NutritionScreen.js - Redesigned with consistent HomeScreen styling
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Platform,
  UIManager,
  LayoutAnimation,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { doc, getDoc, collection, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from './ThemeContext';
import { lightTheme, darkTheme } from './themes';
import { LinearGradient } from 'expo-linear-gradient';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const NutritionScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const colors = theme === 'light' ? lightTheme : darkTheme;

  const [todayNutrition, setTodayNutrition] = useState({
    meals: [],
    totalCalories: 0,
    nutrients: { protein: 0, carbs: 0, fat: 0, fiber: 0 },
  });
  const [weeklyHistory, setWeeklyHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const dailyTargets = { calories: 2000, protein: 150, carbs: 250, fat: 65, fiber: 25 };

  useFocusEffect(
    React.useCallback(() => {
      fetchNutritionData();
    }, [])
  );

  useEffect(() => {
    fetchNutritionData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNutritionData();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setRefreshing(false);
  };

  const fetchNutritionData = async () => {
    try {
      await fetchTodayNutrition();
      await fetchWeeklyHistory();
    } catch (error) {
      console.error('Error fetching nutrition data:', error);
    } finally {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setLoading(false);
    }
  };

  const fetchTodayNutrition = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const nutritionDoc = await getDoc(doc(db, 'nutrition', `${auth.currentUser.uid}_${today}`));
      setTodayNutrition(
        nutritionDoc.exists()
          ? nutritionDoc.data()
          : { meals: [], totalCalories: 0, nutrients: { protein: 0, carbs: 0, fat: 0, fiber: 0 } }
      );
    } catch (error) {
      console.error('Error fetching today nutrition:', error);
    }
  };

  const fetchWeeklyHistory = async () => {
    try {
      const weeklyData = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        const nutritionDoc = await getDoc(doc(db, 'nutrition', `${auth.currentUser.uid}_${dateString}`));
        weeklyData.push({
          date: dateString,
          dayName: date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0),
          fullDayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
          calories: nutritionDoc.exists() ? nutritionDoc.data().totalCalories || 0 : 0,
          isToday: i === 0,
        });
      }
      setWeeklyHistory(weeklyData);
    } catch (error) {
      console.error('Error fetching weekly history:', error);
    }
  };

  const deleteMeal = async (mealIndex) => {
    Alert.alert(
      "Delete Meal",
      "Are you sure you want to delete this meal?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const today = new Date().toISOString().split('T')[0];
              const updatedMeals = todayNutrition.meals.filter((_, i) => i !== mealIndex);

              const newTotals = updatedMeals.reduce(
                (totals, meal) => {
                  meal.foods.forEach(food => {
                    totals.calories += food.calories || 0;
                    totals.protein += food.protein || 0;
                    totals.carbs += food.carbs || 0;
                    totals.fat += food.fat || 0;
                    totals.fiber += food.fiber || 0;
                  });
                  return totals;
                },
                { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
              );

              await setDoc(doc(db, "nutrition", `${auth.currentUser.uid}_${today}`), {
                ...todayNutrition,
                meals: updatedMeals,
                totalCalories: newTotals.calories,
                nutrients: {
                  protein: newTotals.protein,
                  carbs: newTotals.carbs,
                  fat: newTotals.fat,
                  fiber: newTotals.fiber
                }
              });

              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setTodayNutrition(prev => ({
                ...prev,
                meals: updatedMeals,
                totalCalories: newTotals.calories,
                nutrients: newTotals
              }));
            } catch (error) {
              console.error("Error deleting meal:", error);
              Alert.alert("Error", "Failed to delete meal");
            }
          }
        }
      ]
    );
  };

  const getMealTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'breakfast': return '#FF9500';
      case 'lunch': return '#34C759';
      case 'dinner': return '#0A84FF';
      case 'snack': return '#FF3B30';
      default: return colors.accent;
    }
  };

  const getMealTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'breakfast': return 'sunny-outline';
      case 'lunch': return 'fast-food-outline';
      case 'dinner': return 'restaurant-outline';
      case 'snack': return 'nutrition-outline';
      default: return 'fast-food-outline';
    }
  };

  const caloriePercentage = Math.min((todayNutrition.totalCalories / dailyTargets.calories) * 100, 100);

  // Header Component
  const Header = () => (
    <LinearGradient
      colors={['#34C759', '#30B350', '#2AA147']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.header}
    >
      <SafeAreaView edges={['top']}>
        <View style={styles.headerContent}>
          <View style={styles.headerTextRow}>
            <View>
              <Text style={styles.headerTitle}>Nutrition</Text>
              <Text style={styles.headerSubtitle}>Track your daily intake</Text>
            </View>
            <TouchableOpacity 
              style={styles.addButtonHeader}
              onPress={() => navigation.navigate('AddMeal')}
            >
              <Ionicons name="add" size={24} color="#34C759" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );

  // Hero Card - Today's Summary
  const HeroCard = () => (
    <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.heroTopRow}>
        <View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>Today's Calories</Text>
          <Text style={[styles.heroSubtitle, { color: colors.subtext }]}>
            {todayNutrition.totalCalories >= dailyTargets.calories 
              ? "Goal reached! 🎉" 
              : `${Math.round(dailyTargets.calories - todayNutrition.totalCalories)} cal remaining`}
          </Text>
        </View>
        <View style={styles.heroBadge}>
          <Ionicons name="flame" size={16} color="#FF9500" />
          <Text style={styles.heroBadgeText}>{Math.round(caloriePercentage)}%</Text>
        </View>
      </View>

      {/* Calorie Display */}
      <View style={styles.calorieDisplayContainer}>
        <View style={styles.calorieCircle}>
          <Text style={[styles.calorieNumber, { color: colors.text }]}>
            {Math.round(todayNutrition.totalCalories)}
          </Text>
          <Text style={[styles.calorieUnit, { color: colors.subtext }]}>
            / {dailyTargets.calories} cal
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={[styles.heroBarBg, { backgroundColor: theme === 'light' ? '#E5E7EB' : '#1F2937' }]}>
        <View
          style={[
            styles.heroBarFill,
            {
              width: `${caloriePercentage}%`,
              backgroundColor: caloriePercentage >= 100 ? '#22C55E' : '#34C759',
            },
          ]}
        />
      </View>
    </View>
  );

  // Macros Grid
  const MacrosGrid = () => (
    <View style={[styles.macrosCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Macronutrients</Text>
      <View style={styles.macrosGrid}>
        <MacroTile 
          title="Protein"
          current={todayNutrition.nutrients.protein}
          target={dailyTargets.protein}
          unit="g"
          color="#FF6B6B"
          icon="egg-outline"
        />
        <MacroTile 
          title="Carbs"
          current={todayNutrition.nutrients.carbs}
          target={dailyTargets.carbs}
          unit="g"
          color="#4ECDC4"
          icon="leaf-outline"
        />
        <MacroTile 
          title="Fats"
          current={todayNutrition.nutrients.fat}
          target={dailyTargets.fat}
          unit="g"
          color="#45B7D1"
          icon="water-outline"
        />
        <MacroTile 
          title="Fiber"
          current={todayNutrition.nutrients.fiber}
          target={dailyTargets.fiber}
          unit="g"
          color="#96CEB4"
          icon="nutrition-outline"
        />
      </View>
    </View>
  );

  const MacroTile = ({ title, current, target, unit, color, icon }) => {
    const percentage = Math.min((current / target) * 100, 100);
    return (
      <View style={[styles.macroTile, { backgroundColor: theme === 'light' ? '#F9FAFB' : '#111827' }]}>
        <View style={[styles.macroIconBubble, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <Text style={[styles.macroTileTitle, { color: colors.subtext }]}>{title}</Text>
        <Text style={[styles.macroTileValue, { color: colors.text }]}>
          {Math.round(current)}<Text style={[styles.macroTileUnit, { color: colors.subtext }]}>/{target}{unit}</Text>
        </Text>
        <View style={[styles.macroBarBg, { backgroundColor: theme === 'light' ? '#E5E7EB' : '#374151' }]}>
          <View style={[styles.macroBarFill, { width: `${percentage}%`, backgroundColor: color }]} />
        </View>
      </View>
    );
  };

  // Quick Add Section
  const QuickAddMeal = () => (
    <View style={[styles.quickAddCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Add</Text>
      <View style={styles.quickAddGrid}>
        {[
          { type: 'Breakfast', icon: 'sunny', color: '#FF9500' },
          { type: 'Lunch', icon: 'fast-food', color: '#34C759' },
          { type: 'Dinner', icon: 'restaurant', color: '#0A84FF' },
          { type: 'Snack', icon: 'nutrition', color: '#FF3B30' },
        ].map((meal) => (
          <TouchableOpacity
            key={meal.type}
            style={[styles.quickAddButton, { backgroundColor: theme === 'light' ? '#F9FAFB' : '#111827' }]}
            onPress={() => navigation.navigate('AddMeal', { mealType: meal.type })}
            activeOpacity={0.7}
          >
            <View style={[styles.quickAddIconBubble, { backgroundColor: meal.color + '20' }]}>
              <Ionicons name={meal.icon} size={24} color={meal.color} />
            </View>
            <Text style={[styles.quickAddText, { color: colors.text }]}>{meal.type}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // Meal Card Component
  const MealCard = ({ meal, index }) => {
    const totalCalories = meal.foods.reduce((sum, food) => sum + (parseInt(food.calories) || 0), 0);
    const totalProtein = meal.foods.reduce((sum, food) => sum + (parseFloat(food.protein) || 0), 0);
    const totalCarbs = meal.foods.reduce((sum, food) => sum + (parseFloat(food.carbs) || 0), 0);
    const totalFat = meal.foods.reduce((sum, food) => sum + (parseFloat(food.fat) || 0), 0);
    const mealColor = getMealTypeColor(meal.type);

    return (
      <View style={[styles.mealCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Left accent bar */}
        <View style={[styles.mealAccent, { backgroundColor: mealColor }]} />
        
        <View style={styles.mealContent}>
          {/* Header */}
          <View style={styles.mealHeader}>
            <View style={styles.mealTitleRow}>
              <View style={[styles.mealIconWrapper, { backgroundColor: mealColor + '20' }]}>
                <Ionicons name={getMealTypeIcon(meal.type)} size={20} color={mealColor} />
              </View>
              <View style={styles.mealTitleContainer}>
                <Text style={[styles.mealType, { color: colors.text }]}>{meal.type}</Text>
                <Text style={[styles.mealTime, { color: colors.subtext }]}>{meal.time}</Text>
              </View>
            </View>
            <View style={styles.mealActions}>
              <TouchableOpacity
                onPress={() => navigation.navigate('AddMeal', { meal, isEditing: true })}
                style={[styles.actionButton, { backgroundColor: '#0A84FF20' }]}
              >
                <Ionicons name="create-outline" size={16} color="#0A84FF" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => deleteMeal(index)}
                style={[styles.actionButton, { backgroundColor: '#FF3B3020' }]}
              >
                <Ionicons name="trash-outline" size={16} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Item count badge */}
          <View style={styles.mealBadgeRow}>
            <View style={[styles.itemCountBadge, { backgroundColor: mealColor }]}>
              <Text style={styles.itemCountText}>{meal.foods.length} ITEM{meal.foods.length !== 1 ? 'S' : ''}</Text>
            </View>
          </View>

          {/* Food items */}
          <View style={styles.foodItemsContainer}>
            {meal.foods.map((food, idx) => (
              <View key={idx} style={[styles.foodItem, { backgroundColor: theme === 'light' ? '#F9FAFB' : '#111827' }]}>
                <View style={styles.foodItemLeft}>
                  <View style={[styles.foodBullet, { backgroundColor: mealColor }]} />
                  <Text style={[styles.foodName, { color: colors.text }]} numberOfLines={1}>
                    {food.name}
                  </Text>
                </View>
                <Text style={[styles.foodCalories, { color: mealColor }]}>
                  {food.calories} cal
                </Text>
              </View>
            ))}
          </View>

          {/* Macros summary */}
          {(totalProtein > 0 || totalCarbs > 0 || totalFat > 0) && (
            <View style={[styles.mealMacrosSummary, { backgroundColor: theme === 'light' ? '#F9FAFB' : '#111827' }]}>
              {totalProtein > 0 && (
                <View style={styles.mealMacroItem}>
                  <Text style={[styles.mealMacroLabel, { color: colors.subtext }]}>Protein</Text>
                  <Text style={[styles.mealMacroValue, { color: '#FF6B6B' }]}>{Math.round(totalProtein)}g</Text>
                </View>
              )}
              {totalCarbs > 0 && (
                <View style={styles.mealMacroItem}>
                  <Text style={[styles.mealMacroLabel, { color: colors.subtext }]}>Carbs</Text>
                  <Text style={[styles.mealMacroValue, { color: '#4ECDC4' }]}>{Math.round(totalCarbs)}g</Text>
                </View>
              )}
              {totalFat > 0 && (
                <View style={styles.mealMacroItem}>
                  <Text style={[styles.mealMacroLabel, { color: colors.subtext }]}>Fat</Text>
                  <Text style={[styles.mealMacroValue, { color: '#45B7D1' }]}>{Math.round(totalFat)}g</Text>
                </View>
              )}
            </View>
          )}

          {/* Total calories */}
          <View style={[styles.totalCaloriesBar, { backgroundColor: mealColor + '15' }]}>
            <Ionicons name="flame" size={16} color={mealColor} />
            <Text style={[styles.totalCaloriesText, { color: mealColor }]}>
              {totalCalories} calories
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // Weekly Chart
  const WeeklyChart = () => {
    const max = Math.max(...weeklyHistory.map(d => d.calories), dailyTargets.calories, 1);
    
    return (
      <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.chartHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Weekly Overview</Text>
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#34C759' }]} />
              <Text style={[styles.legendText, { color: colors.subtext }]}>On track</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FF9500' }]} />
              <Text style={[styles.legendText, { color: colors.subtext }]}>Below</Text>
            </View>
          </View>
        </View>

        <View style={styles.chartBarsContainer}>
          {weeklyHistory.map((day, index) => {
            const barHeight = Math.max((day.calories / max) * 100, 4);
            const isOnTrack = day.calories >= dailyTargets.calories * 0.8;
            
            return (
              <View key={index} style={styles.chartBarCol}>
                <View style={styles.chartBarWrapper}>
                  <View
                    style={[
                      styles.chartBar,
                      {
                        height: `${barHeight}%`,
                        backgroundColor: day.calories === 0 ? '#E5E7EB' : isOnTrack ? '#34C759' : '#FF9500',
                      },
                    ]}
                  />
                </View>
                <Text style={[
                  styles.chartBarLabel, 
                  { 
                    color: day.isToday ? '#34C759' : colors.subtext,
                    fontWeight: day.isToday ? '700' : '600',
                  }
                ]}>
                  {day.dayName}
                </Text>
                <Text style={[styles.chartBarValue, { color: colors.text }]}>{day.calories}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  // Empty Meals State
  const EmptyMeals = () => (
    <View style={[styles.emptyMealsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.emptyIconContainer}>
        <LinearGradient
          colors={['#34C759', '#30B350']}
          style={styles.emptyIconGradient}
        >
          <Ionicons name="restaurant-outline" size={32} color="#fff" />
        </LinearGradient>
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No meals logged yet</Text>
      <Text style={[styles.emptySubtext, { color: colors.subtext }]}>
        Tap Quick Add above to log your first meal
      </Text>
    </View>
  );

  // Tips Card
  const TipsCard = () => (
    <View style={[styles.tipsCard, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
      <View style={styles.tipsHeader}>
        <Text style={styles.tipsIcon}>💡</Text>
        <Text style={styles.tipsTitle}>Healthy Eating Tips</Text>
      </View>
      <View style={styles.tipsList}>
        {[
          { icon: '🥗', text: 'Focus on whole, unprocessed foods' },
          { icon: '🌈', text: 'Include colorful fruits & veggies' },
          { icon: '💧', text: 'Stay hydrated throughout the day' },
          { icon: '🧘', text: 'Listen to hunger and fullness cues' },
          { icon: '🎯', text: 'Remember: progress, not perfection' },
        ].map((tip, index) => (
          <View key={index} style={styles.tipItem}>
            <Text style={styles.tipIcon}>{tip.icon}</Text>
            <Text style={styles.tipText}>{tip.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header />
        <View style={styles.loadingContainer}>
          <Ionicons name="nutrition" size={48} color="#34C759" />
          <Text style={[styles.loadingText, { color: colors.subtext }]}>Loading nutrition data...</Text>
        </View>
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
            tintColor="#34C759"
            colors={['#34C759']}
          />
        }
      >
        {/* Hero Card */}
        <View style={styles.section}>
          <HeroCard />
        </View>

        {/* Macros Grid */}
        <View style={styles.section}>
          <MacrosGrid />
        </View>

        {/* Quick Add */}
        <View style={styles.section}>
          <QuickAddMeal />
        </View>

        {/* Today's Meals */}
        <View style={styles.section}>
          <View style={styles.mealsHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Today's Meals</Text>
            {todayNutrition.meals.length > 0 && (
              <View style={[styles.mealsCountBadge, { backgroundColor: '#34C75920' }]}>
                <Text style={[styles.mealsCountText, { color: '#34C759' }]}>{todayNutrition.meals.length}</Text>
              </View>
            )}
          </View>
          
          {todayNutrition.meals.length === 0 ? (
            <EmptyMeals />
          ) : (
            todayNutrition.meals.map((meal, index) => (
              <MealCard key={index} meal={meal} index={index} />
            ))
          )}
        </View>

        {/* Weekly Chart */}
        <View style={styles.section}>
          <WeeklyChart />
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },

  // Hero Card
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
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  heroBadgeText: {
    color: '#C2410C',
    fontSize: 13,
    marginLeft: 6,
    fontWeight: '700',
  },
  calorieDisplayContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  calorieCircle: {
    alignItems: 'center',
  },
  calorieNumber: {
    fontSize: 56,
    fontWeight: '800',
  },
  calorieUnit: {
    fontSize: 16,
    marginTop: 4,
  },
  heroBarBg: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
  },
  heroBarFill: {
    height: '100%',
    borderRadius: 999,
  },

  // Macros Card
  macrosCard: {
    borderRadius: 26,
    padding: 20,
    borderWidth: 1,
  },
  macrosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  macroTile: {
    width: '48%',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  macroIconBubble: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  macroTileTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  macroTileValue: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
  },
  macroTileUnit: {
    fontSize: 12,
    fontWeight: '500',
  },
  macroBarBg: {
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: 999,
  },

  // Quick Add
  quickAddCard: {
    borderRadius: 26,
    padding: 20,
    borderWidth: 1,
  },
  quickAddGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAddButton: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginHorizontal: 4,
  },
  quickAddIconBubble: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickAddText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Meals Section
  mealsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  mealsCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  mealsCountText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Meal Card
  mealCard: {
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
  mealAccent: {
    width: 5,
  },
  mealContent: {
    flex: 1,
    padding: 16,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  mealTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mealIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  mealTitleContainer: {
    flex: 1,
  },
  mealType: {
    fontSize: 18,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  mealTime: {
    fontSize: 12,
    marginTop: 2,
  },
  mealActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealBadgeRow: {
    marginBottom: 12,
  },
  itemCountBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  itemCountText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  foodItemsContainer: {
    marginBottom: 12,
    gap: 8,
  },
  foodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  foodItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  foodBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  foodName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  foodCalories: {
    fontSize: 14,
    fontWeight: '700',
  },
  mealMacrosSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  mealMacroItem: {
    alignItems: 'center',
  },
  mealMacroLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  mealMacroValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  totalCaloriesBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  totalCaloriesText: {
    fontSize: 15,
    fontWeight: '700',
  },

  // Empty Meals
  emptyMealsCard: {
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyIconContainer: {
    marginBottom: 16,
  },
  emptyIconGradient: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
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
    fontSize: 11,
    fontWeight: '700',
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
    color: '#059669',
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
    color: '#059669',
    flex: 1,
    lineHeight: 20,
  },

  bottomSpacer: {
    height: 20,
  },
});

export default NutritionScreen;