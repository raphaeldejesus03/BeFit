// src/screens/ProfileScreen.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Switch,
  RefreshControl,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useTheme } from './ThemeContext';
import { lightTheme, darkTheme } from './themes';
import AchievementsPanel from '../gamification/AchievementsPanel';
import { readGamification } from '../gamification/engine';

// Helper function to get badge color based on level (kept consistent with HomeScreen)
const getLevelColor = (levelName) => {
  switch (levelName?.toLowerCase()) {
    case 'bronze':
      return '#CD7F32';
    case 'silver':
      return '#C0C0C0';
    case 'gold':
      return '#FFD700';
    case 'platinum':
      return '#E5E4E2';
    default:
      return '#CD7F32';
  }
};

// Helper function to get badge icon based on level (kept consistent with HomeScreen)
const getLevelIcon = (levelName) => {
  switch (levelName?.toLowerCase()) {
    case 'bronze':
      return 'medal-outline';
    case 'silver':
      return 'medal';
    case 'gold':
      return 'crown-outline';
    case 'platinum':
      return 'crown';
    default:
      return 'medal-outline';
  }
};

const ProfileScreen = ({ navigation }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const colors = isDark ? darkTheme : lightTheme;

  const [refreshing, setRefreshing] = useState(false);

  const [userData, setUserData] = useState({
    name: '',
    fullName: '',
    email: '',
    avatar: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
  });

  const [g, setG] = useState(null);

  const displayName = useMemo(() => {
    return userData?.name || userData?.fullName || 'athlete';
  }, [userData]);

  const displayEmail = useMemo(() => {
    return userData?.email || auth?.currentUser?.email || '';
  }, [userData]);

  const levelName = g?.levelName || 'Bronze';
  const levelColor = getLevelColor(levelName);
  const levelIcon = getLevelIcon(levelName);

  const fetchAll = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setUserData((prev) => ({ ...prev, ...docSnap.data() }));
      } else {
        setUserData((prev) => ({
          ...prev,
          email: user.email || prev.email,
        }));
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }

    try {
      const meta = await readGamification(user.uid);
      setG(meta);
    } catch (error) {
      console.error('Error fetching gamification:', error);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  const logout = async () => {
    try {
      await auth.signOut();
      Alert.alert('Logged out', 'You have been signed out successfully');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const SettingRow = ({ icon, label, right, onPress, danger }) => {
    const bg = danger ? '#FF3B30' : colors.card;
    const textColor = danger ? '#fff' : colors.text;
    const iconColor = danger ? '#fff' : colors.accent;

    const content = (
      <View style={styles.settingRowInner}>
        <View style={styles.settingLeft}>
          <Ionicons name={icon} size={20} color={iconColor} />
          <Text style={[styles.settingLabel, { color: textColor }]}>{label}</Text>
        </View>
        {right}
      </View>
    );

    return (
      <TouchableOpacity
        activeOpacity={danger ? 0.9 : 0.8}
        onPress={onPress}
        style={[
          styles.settingRow,
          {
            backgroundColor: bg,
            borderColor: danger ? 'transparent' : colors.border,
          },
        ]}
      >
        {content}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Gradient Header (expands fully to the top like WorkoutScreen) */}
        <LinearGradient
          colors={['#1A6DFF', '#22C1C3']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <SafeAreaView>
            <View style={styles.headerInner}>
              {/* Centered Avatar */}
              <View style={styles.avatarCenterWrap}>
                <View style={styles.avatarWrapLarge}>
                  <Image source={{ uri: userData.avatar }} style={styles.avatarLarge} />
                </View>
              </View>

              {/* Centered Name + Email */}
              <View style={styles.headerTextCenter}>
                <Text style={styles.profileName}>{displayName}</Text>
                {!!displayEmail && <Text style={styles.profileEmail}>{displayEmail}</Text>}
              </View>

              {/* Centered Level pill -> Achievements */}
              <View style={styles.levelPillCenter}>
                <TouchableOpacity
                  style={[
                    styles.levelPill,
                    {
                      backgroundColor: 'rgba(255,255,255,0.95)',
                      borderColor: levelColor,
                    },
                  ]}
                  onPress={() => navigation.navigate('Achievements')}
                  activeOpacity={0.85}
                >
                  <View style={[styles.levelIconWrap, { backgroundColor: levelColor }]}>
                    <MaterialCommunityIcons name={levelIcon} size={14} color="#fff" />
                  </View>
                  <Text style={styles.levelText}>{levelName}</Text>
                  <Ionicons name="chevron-forward" size={14} color={levelColor} />
                </TouchableOpacity>
              </View>

              {/* Secondary Row: quick profile actions */}
              <View style={styles.headerQuickRow}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.headerChip}
                  onPress={() => navigation.navigate('EditProfile')}
                >
                  <Ionicons name="create-outline" size={16} color="#fff" />
                  <Text style={styles.headerChipText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.headerChip}
                  onPress={() => navigation.navigate('Goals')}
                >
                  <Ionicons name="flag-outline" size={16} color="#fff" />
                  <Text style={styles.headerChipText}>Goals</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.headerChip}
                  onPress={() => navigation.navigate('Progress')}
                >
                  <Ionicons name="stats-chart-outline" size={16} color="#fff" />
                  <Text style={styles.headerChipText}>Progress</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>

        {/* Achievements Card */}
        <View style={styles.section}>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Achievements</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Achievements')} activeOpacity={0.8}>
                <Text style={[styles.linkText, { color: colors.accent }]}>See all</Text>
              </TouchableOpacity>
            </View>

            {g ? (
              <AchievementsPanel
                levelName={g.levelName}
                xp={g.xp}
                streaks={g.streaks}
                badges={g.badges}
                colors={colors}
              />
            ) : (
              <Text style={[styles.loadingText, { color: colors.subtext }]}>
                Loading achievements...
              </Text>
            )}
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Settings</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.subtext }]}>
              Personalize the app experience.
            </Text>

            <View style={{ marginTop: 12 }}>
              <SettingRow
                icon="moon-outline"
                label="Dark Mode"
                onPress={toggleTheme}
                right={
                  <Switch
                    value={isDark}
                    onValueChange={toggleTheme}
                    thumbColor={isDark ? '#fff' : '#f4f3f4'}
                    trackColor={{ false: '#ccc', true: '#007AFF' }}
                    ios_backgroundColor="#ccc"
                  />
                }
              />

              <SettingRow
                icon="shield-checkmark-outline"
                label="Privacy"
                onPress={() => Alert.alert('Privacy', 'Add your privacy screen here')}
                right={<Ionicons name="chevron-forward" size={18} color={colors.subtext} />}
              />

              <SettingRow
                icon="help-circle-outline"
                label="Help & Support"
                onPress={() => Alert.alert('Support', 'Add your support screen here')}
                right={<Ionicons name="chevron-forward" size={18} color={colors.subtext} />}
              />

              <SettingRow icon="log-out-outline" label="Logout" danger onPress={logout} right={null} />
            </View>
          </View>
        </View>

        <View style={{ height: 18 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: 24 },

  // Gradient starts at y=0 (no SafeAreaView wrapping the whole screen)
  headerGradient: {
    paddingTop: 0,
    paddingBottom: 18,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },

  // Keeps spacing consistent while allowing the gradient to start at y=0
  headerInner: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },

  avatarCenterWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 10,
  },
  avatarWrapLarge: {
    width: 108,
    height: 108,
    borderRadius: 34,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  avatarLarge: { width: '100%', height: '100%' },

  headerTextCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  profileName: { fontSize: 22, fontWeight: '900', color: '#fff' },
  profileEmail: { fontSize: 12, marginTop: 4, color: 'rgba(255,255,255,0.88)' },

  levelPillCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  levelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingLeft: 7,
    paddingRight: 12,
    borderRadius: 999,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
    elevation: 4,
  },
  levelIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 7,
  },
  levelText: {
    fontSize: 13,
    fontWeight: '800',
    marginRight: 6,
    color: '#111827',
  },

  headerQuickRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  headerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  headerChipText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  section: {
    paddingHorizontal: 20,
    marginTop: 12,
  },
  card: {
    borderRadius: 26,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderWidth: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 20, fontWeight: '800' },
  sectionSubtitle: { fontSize: 13, marginTop: 6 },
  linkText: { fontSize: 14, fontWeight: '700' },
  loadingText: { textAlign: 'center', fontSize: 14, marginTop: 10 },

  settingRow: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },
  settingRowInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
});

export default ProfileScreen;
