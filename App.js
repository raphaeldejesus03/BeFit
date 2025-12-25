// App.js - UPDATED NAV BAR DESIGN (same position/layout, improved styling/colors)
import 'react-native-gesture-handler';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './src/services/firebase';
import { useTheme, ThemeProvider } from './src/screens/ThemeContext';
import { lightTheme, darkTheme } from './src/screens/themes';

// Auth screens
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';

// Main app screens
import HomeScreen from './src/screens/HomeScreen';
import WorkoutScreen from './src/screens/WorkoutScreen';
import ProgressScreen from './src/screens/ProgressScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import NutritionScreen from './src/screens/NutritionScreen';
import WaterTrackerScreen from './src/screens/WaterTrackerScreen';
import GoalsScreen from './src/screens/GoalsScreen';
import WorkoutDetailScreen from './src/screens/WorkoutDetailScreen';

// Hidden / detail screens
import AddWorkoutScreen from './src/screens/AddWorkoutScreen';
import EditWorkoutScreen from './src/screens/EditWorkoutScreen';
import AddMealScreen from './src/screens/AddMealScreen';
import EditGoalScreen from './src/screens/EditGoalScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';

// Gamification screen
import AchievementsScreen from './src/screens/AchievementsScreen';

// AI Chat
import ChatbotScreen from './src/screens/ChatbotScreen';
import FloatingChatButton from './src/components/FloatingChatButton';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const PRIMARY_TABS = ['Home', 'Workout', 'MoreCenterTab', 'Nutrition', 'Profile'];

function BeFitTabBar({ state, navigation, themeColors }) {
  const [moreVisible, setMoreVisible] = useState(false);
  const activeRouteName = state.routes[state.index].name;

  const quickActions = [
    { label: 'Progress', icon: 'stats-chart-outline', screen: 'Progress' },
    { label: 'Water tracker', icon: 'water-outline', screen: 'WaterTracker' },
    { label: 'Goals', icon: 'flag-outline', screen: 'Goals' },
    { label: 'Achievements', icon: 'trophy-outline', screen: 'Achievements' },
  ];

  const renderIcon = (routeName, focused) => {
    const color = focused ? themeColors.accent : themeColors.subtext;
    const size = 22;

    switch (routeName) {
      case 'Home':
        return <Ionicons name="home-outline" size={size} color={color} />;
      case 'Workout':
        return <Ionicons name="barbell-outline" size={size} color={color} />;
      case 'Nutrition':
        return <Ionicons name="nutrition-outline" size={size} color={color} />;
      case 'Profile':
        return <Ionicons name="person-outline" size={size} color={color} />;
      case 'MoreCenterTab':
        return (
          <View style={styles.moreCircleOuter}>
            <LinearGradient
              colors={['#6D28D9', '#2563EB', '#F59E0B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.moreCircle}
            >
              <Ionicons name="grid" size={20} color="#fff" />
            </LinearGradient>
          </View>
        );
      default:
        return null;
    }
  };

  const getLabel = (routeName) => {
    // Keep original labels clean (no changing tabs)
    if (routeName === 'MoreCenterTab') return '';
    return routeName;
  };

  return (
    <>
      {/* SAME POSITION: bottom bar strip (no floating/moving) */}
      <SafeAreaView
        style={[
          styles.tabBar,
          {
            backgroundColor: themeColors.card,
            borderTopColor: themeColors.border,
            shadowColor: '#000',
          },
        ]}
      >
        {PRIMARY_TABS.map((routeName) => {
          const route = state.routes.find((r) => r.name === routeName);
          if (!route) return null;

          const isFocused = activeRouteName === routeName;

          return (
            <TouchableOpacity
              key={route.key ?? routeName}
              onPress={() => {
                if (routeName === 'MoreCenterTab') {
                  setMoreVisible(true);
                  return;
                }
                navigation.navigate(routeName);
              }}
              style={styles.tabButton}
              activeOpacity={0.85}
            >
              {/* Focus highlight behind icon ONLY (no layout shift) */}
              {routeName !== 'MoreCenterTab' ? (
                <View
                  style={[
                    styles.iconPill,
                    {
                      backgroundColor: isFocused
                        ? themeColors.accent + '18'
                        : 'transparent',
                      borderColor: isFocused
                        ? themeColors.accent + '35'
                        : 'transparent',
                    },
                  ]}
                >
                  {renderIcon(routeName, isFocused)}
                </View>
              ) : (
                renderIcon(routeName, isFocused)
              )}

              {routeName !== 'MoreCenterTab' && (
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: isFocused ? themeColors.accent : themeColors.subtext,
                      fontWeight: isFocused ? '800' : '700',
                    },
                  ]}
                >
                  {getLabel(routeName)}
                </Text>
              )}

              {/* Tiny dot indicator for active tab */}
              {routeName !== 'MoreCenterTab' && isFocused && (
                <View
                  style={[
                    styles.activeDot,
                    { backgroundColor: themeColors.accent },
                  ]}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </SafeAreaView>

      {/* More / Quick Actions modal (same behavior, cleaner style) */}
      <Modal
        visible={moreVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMoreVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPressOut={() => setMoreVisible(false)}
        >
          <View
            style={[
              styles.moreCard,
              {
                backgroundColor: themeColors.card,
                borderColor: themeColors.border,
              },
            ]}
          >
            <View style={styles.moreHeaderRow}>
              <View
                style={[
                  styles.moreHeaderIcon,
                  { backgroundColor: themeColors.accent + '18' },
                ]}
              >
                <Ionicons name="sparkles" size={16} color={themeColors.accent} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.moreTitle, { color: themeColors.text }]}>
                  Quick Actions
                </Text>
                <Text style={[styles.moreSubtitle, { color: themeColors.subtext }]}>
                  Jump to your most-used screens.
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setMoreVisible(false)}
                activeOpacity={0.8}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={18} color={themeColors.subtext} />
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: 12 }}>
              {quickActions.map((item) => (
                <TouchableOpacity
                  key={item.screen}
                  style={[
                    styles.moreItem,
                    {
                      borderColor: themeColors.border,
                      backgroundColor:
                        themeColors === lightTheme ? '#FFFFFF' : '#0B1120',
                    },
                  ]}
                  onPress={() => {
                    setMoreVisible(false);
                    navigation.navigate(item.screen);
                  }}
                  activeOpacity={0.85}
                >
                  <View
                    style={[
                      styles.moreItemIcon,
                      { backgroundColor: themeColors.accent + '18' },
                    ]}
                  >
                    <Ionicons
                      name={item.icon}
                      size={18}
                      color={themeColors.accent}
                    />
                  </View>

                  <Text
                    style={[
                      styles.moreItemLabel,
                      { color: themeColors.text },
                    ]}
                  >
                    {item.label}
                  </Text>

                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={themeColors.subtext}
                    style={{ marginLeft: 'auto' }}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

function MainTabs() {
  const { theme } = useTheme();
  const themeColors = theme === 'light' ? lightTheme : darkTheme;
  const [chatVisible, setChatVisible] = useState(false);

  // FIX: memoize properly
  const renderTabBar = useCallback(
    (props) => <BeFitTabBar {...props} themeColors={themeColors} />,
    [themeColors]
  );

  return (
    <>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
        }}
        tabBar={renderTabBar}
      >
        {/* Visible tabs */}
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Workout" component={WorkoutScreen} />
        <Tab.Screen
          name="MoreCenterTab"
          component={HomeScreen}
          options={{ tabBarButton: () => null }}
        />
        <Tab.Screen name="Nutrition" component={NutritionScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />

        {/* Hidden screens accessed via navigation */}
        <Tab.Screen name="Progress" component={ProgressScreen} options={{ tabBarButton: () => null }} />
        <Tab.Screen name="WaterTracker" component={WaterTrackerScreen} options={{ tabBarButton: () => null }} />
        <Tab.Screen name="Goals" component={GoalsScreen} options={{ tabBarButton: () => null }} />
        <Tab.Screen name="AddWorkout" component={AddWorkoutScreen} options={{ tabBarButton: () => null }} />
        <Tab.Screen name="EditWorkout" component={EditWorkoutScreen} options={{ tabBarButton: () => null }} />
        <Tab.Screen name="AddMeal" component={AddMealScreen} options={{ tabBarButton: () => null }} />
        <Tab.Screen name="EditGoal" component={EditGoalScreen} options={{ tabBarButton: () => null }} />
        <Tab.Screen name="EditProfile" component={EditProfileScreen} options={{ tabBarButton: () => null }} />
        <Tab.Screen name="Achievements" component={AchievementsScreen} options={{ tabBarButton: () => null }} />
        <Tab.Screen name="WorkoutDetail" component={WorkoutDetailScreen} options={{ tabBarButton: () => null }} />
      </Tab.Navigator>

      {/* Floating AI Chat Button */}
      <FloatingChatButton onPress={() => setChatVisible(true)} />

      {/* AI Chat overlay */}
      {chatVisible && (
        <View style={styles.chatOverlay}>
          <ChatbotScreen
            navigation={{
              goBack: () => setChatVisible(false),
            }}
          />
        </View>
      )}
    </>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
  );
}

function AppContent() {
  const { theme } = useTheme();
  const themeColors = theme === 'light' ? lightTheme : darkTheme;
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setCheckingAuth(false);
    });
    return unsubscribe;
  }, []);

  if (checkingAuth) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: themeColors.background },
        ]}
      >
        <ActivityIndicator size="large" color={themeColors.accent} />
        <Text style={[styles.loadingText, { color: themeColors.subtext }]}>
          Loading BeFit.
        </Text>
      </View>
    );
  }

  return (
    <NavigationContainer>{user ? <MainTabs /> : <AuthStack />}</NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  /* Loading screen */
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '700',
  },

  /* Chat overlay */
  chatOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  /* Navigation bar (SAME POSITION; improved look only) */
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    // subtle premium shadow (does not move bar)
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 14,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 3,
  },
  iconPill: {
    width: 44,
    height: 34,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 99,
    marginTop: 4,
  },

  /* Centered More button (same position/size; gradient theme) */
  moreCircleOuter: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 16,
  },

  /* More popup modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  moreCard: {
    margin: 16,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  moreHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  moreHeaderIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
  },
  moreTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  moreSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  moreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  moreItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  moreItemLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
});
