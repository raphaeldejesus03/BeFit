// src/gamification/AchievementsPanel.js
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function AchievementsPanel({
  levelName,
  xp = 0,
  streaks = {},
  badges = {},
  colors,
}) {
  const unlockedCount = useMemo(
    () => Object.values(badges || {}).filter(Boolean).length,
    [badges]
  );

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Title row */}
      <View style={styles.topRow}>
        <View style={[styles.iconBubble, { backgroundColor: colors.accent + '22' }]}>
          <MaterialCommunityIcons name="trophy-outline" size={18} color={colors.accent} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Your Progress</Text>
          <Text style={[styles.subtitle, { color: colors.subtext }]}>
            Streaks and unlocked badges
          </Text>
        </View>

        {/* Small XP chip (no bar — header already has the bar) */}
        <View style={[styles.xpChip, { backgroundColor: colors.accent + '18' }]}>
          <MaterialCommunityIcons name="star-four-points" size={14} color={colors.accent} />
          <Text style={[styles.xpChipText, { color: colors.accent }]}>{xp} XP</Text>
        </View>
      </View>

      {/* Streaks */}
      <View style={styles.streakRow}>
        <StreakChip label="Workout" value={streaks.workout || 0} icon="fire" color="#F97316" />
        <StreakChip label="Water" value={streaks.water || 0} icon="water" color="#3B82F6" />
        <StreakChip label="Nutrition" value={streaks.nutrition || 0} icon="food-apple" color="#22C55E" />
      </View>

      {/* Footer */}
      <View style={[styles.footerRow, { borderTopColor: colors.border }]}>
        <View>
          <Text style={[styles.footerLabel, { color: colors.subtext }]}>Unlocked badges</Text>
          <Text style={[styles.footerValue, { color: colors.text }]}>{unlockedCount}</Text>
        </View>

        <View style={styles.rightMeta}>
          <Text style={[styles.footerLabel, { color: colors.subtext }]}>Level</Text>
          <Text style={[styles.footerValueSmall, { color: colors.text }]}>{levelName}</Text>
        </View>
      </View>
    </View>
  );
}

const StreakChip = ({ label, value, icon, color }) => (
  <View style={[styles.streakChip, { backgroundColor: color + '18' }]}>
    <MaterialCommunityIcons name={icon} size={16} color={color} />
    <Text style={styles.streakValue}>{value}</Text>
    <Text style={styles.streakLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 18,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: { fontSize: 16, fontWeight: '900' },
  subtitle: { fontSize: 12, fontWeight: '700', marginTop: 2 },

  xpChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
  xpChipText: { fontSize: 12, fontWeight: '900' },

  streakRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  streakChip: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 16,
    alignItems: 'center',
  },
  streakValue: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 4,
    color: '#111827',
  },
  streakLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
    color: '#374151',
  },

  footerRow: {
    borderTopWidth: 1,
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLabel: { fontSize: 12, fontWeight: '700' },
  footerValue: { fontSize: 18, fontWeight: '900' },
  rightMeta: { alignItems: 'flex-end' },
  footerValueSmall: { fontSize: 14, fontWeight: '900' },
});
