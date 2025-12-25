// src/components/FloatingChatButton.js
import React from 'react';
import { TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { useTheme } from '../screens/ThemeContext';
import { lightTheme, darkTheme } from '../screens/themes';

const FloatingChatButton = ({ onPress }) => {
  const { theme } = useTheme();
  const colors = theme === 'light' ? lightTheme : darkTheme;

  return (
    <TouchableOpacity
      style={[styles.floatingButton, { backgroundColor: colors.accent }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Animated.Text style={styles.buttonText}>🤖</Animated.Text>
    </TouchableOpacity>
  );
};

// Keeps spacing consistent across devices and clears the bottom tab bar area.
// (Does NOT move your navbar—only moves the chatbot button up.)
const TAB_BAR_HEIGHT = 64; // typical tab bar height
const SAFE_GAP = Platform.OS === 'ios' ? 18 : 14; // extra breathing room

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    right: 20,
    bottom: TAB_BAR_HEIGHT + SAFE_GAP + 40, // raised more to avoid overlapping Profile tab
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
    zIndex: 999,
  },
  buttonText: {
    fontSize: 28,
  },
});

export default FloatingChatButton;
