import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { sendMessageToGemini, getQuickTip } from '../services/geminiApi';
import { useTheme } from './ThemeContext';
import { lightTheme, darkTheme } from './themes';
import { SafeAreaView } from 'react-native-safe-area-context';

const ChatbotScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const colors = theme === 'light' ? lightTheme : darkTheme;

  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hi! I'm your AI fitness coach. Ask me anything about workouts, nutrition, or your fitness journey! 💪",
      sender: 'ai',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState({});
  const scrollViewRef = useRef();

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const userProfile = userDoc.exists() ? userDoc.data() : {};

      const workoutsQuery = query(
        collection(db, 'workouts'),
        where('userId', '==', auth.currentUser.uid)
      );
      const workoutsSnapshot = await getDocs(workoutsQuery);
      const workouts = workoutsSnapshot.docs.map(doc => doc.data());
      
      workouts.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
        const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
        return dateB - dateA;
      });

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const weeklyWorkouts = workouts.filter(w => {
        const date = w.createdAt?.toDate?.() || new Date(w.createdAt);
        return date >= oneWeekAgo;
      }).length;

      const today = new Date().toISOString().split('T')[0];
      const nutritionDoc = await getDoc(
        doc(db, 'nutrition', `${auth.currentUser.uid}_${today}`)
      );
      const todayCalories = nutritionDoc.exists() 
        ? nutritionDoc.data().totalCalories || 0 
        : 0;

      setUserData({
        totalWorkouts: userProfile.totalWorkouts || 0,
        goals: userProfile.goals || {},
        recentWorkouts: workouts.slice(0, 5),
        weeklyWorkouts,
        todayCalories,
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      // Pass entire conversation history to Gemini
      const aiResponse = await sendMessageToGemini(
        inputText.trim(), 
        userData, 
        messages // Pass conversation history
      );
      
      const aiMessage = {
        id: Date.now() + 1,
        text: aiResponse,
        sender: 'ai',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to get response');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = async (action) => {
    setLoading(true);
    try {
      let response;
      switch (action) {
        case 'workout':
          response = await sendMessageToGemini(
            'Suggest a workout for me today based on my history',
            userData,
            messages // Pass conversation history
          );
          break;
        case 'nutrition':
          response = await sendMessageToGemini(
            'Give me nutrition advice based on my current intake',
            userData,
            messages // Pass conversation history
          );
          break;
        case 'tip':
          response = await getQuickTip('general');
          break;
        case 'progress':
          response = await sendMessageToGemini(
            'Analyze my fitness progress and give me feedback',
            userData,
            messages // Pass conversation history
          );
          break;
        default:
          response = 'How can I help you today?';
      }

      const aiMessage = {
        id: Date.now(),
        text: response,
        sender: 'ai',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      Alert.alert('Error', 'Failed to get response');
    } finally {
      setLoading(false);
    }
  };

  const FormattedMessage = ({ text }) => {
    // Clean up text: remove <br> tags and normalize line breaks
    const cleanText = text.replace(/<br\s*\/?>/gi, '\n').trim();
    
    // Parse message into sections
    const parseContent = () => {
      const sections = [];
      let currentSection = { type: 'text', content: '' };
      
      // Split by lines
      const lines = cleanText.split('\n');
      
      lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) {
          // Empty line - add spacing
          if (currentSection.content && currentSection.content.trim()) {
            sections.push(currentSection);
            currentSection = { type: 'text', content: '' };
          }
          return;
        }
        
        // Check for numbered items (1. 2. 3. etc)
        const numberedMatch = trimmedLine.match(/^(\d+)\.\s+\*\*(.+?)\*\*:?\s*(.*)/);
        if (numberedMatch) {
          // Save previous section if it has content
          if (currentSection.content && currentSection.content.trim()) {
            sections.push(currentSection);
          }
          
          sections.push({
            type: 'numbered',
            number: numberedMatch[1],
            title: numberedMatch[2],
            content: numberedMatch[3],
          });
          currentSection = { type: 'text', content: '' };
        }
        // Check for bold headers (**Title:**)
        else if (trimmedLine.match(/^\*\*(.+?)\*\*:?\s*(.*)/)) {
          const headerMatch = trimmedLine.match(/^\*\*(.+?)\*\*:?\s*(.*)/);
          if (currentSection.content && currentSection.content.trim()) {
            sections.push(currentSection);
          }
          
          sections.push({
            type: 'header',
            title: headerMatch[1],
            content: headerMatch[2],
          });
          currentSection = { type: 'text', content: '' };
        }
        // Check for bullet points with asterisks or dashes
        else if (trimmedLine.match(/^[\*\-]\s+(.+)/)) {
          const bulletMatch = trimmedLine.match(/^[\*\-]\s+(.+)/);
          if (currentSection.type !== 'bullets') {
            if (currentSection.content && currentSection.content.trim()) {
              sections.push(currentSection);
            }
            currentSection = { type: 'bullets', items: [] };
          }
          currentSection.items.push(bulletMatch[1]);
        }
        else {
          // Regular text
          if (currentSection.type === 'bullets') {
            sections.push(currentSection);
            currentSection = { type: 'text', content: '' };
          }
          currentSection.content += (currentSection.content ? '\n' : '') + trimmedLine;
        }
      });
      
      // Add last section
      if ((currentSection.content && currentSection.content.trim()) || 
          (currentSection.items && currentSection.items.length > 0)) {
        sections.push(currentSection);
      }
      
      return sections;
    };

    const renderSection = (section, index) => {
      if (!section) return null;
      
      switch (section.type) {
        case 'numbered':
          return (
            <View key={index} style={styles.numberedSection}>
              <View style={[styles.numberBadge, { backgroundColor: colors.accent }]}>
                <Text style={styles.numberText}>{section.number}</Text>
              </View>
              <View style={styles.sectionContent}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {section.title || ''}
                </Text>
                {section.content && section.content.trim() && (
                  <Text style={[styles.sectionBody, { color: colors.subtext }]}>
                    {section.content.trim()}
                  </Text>
                )}
              </View>
            </View>
          );
        
        case 'header':
          return (
            <View key={index} style={styles.headerSection}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                {section.title || ''}
              </Text>
              {section.content && section.content.trim() && (
                <Text style={[styles.headerContent, { color: colors.subtext }]}>
                  {section.content.trim()}
                </Text>
              )}
            </View>
          );
        
        case 'bullets':
          if (!section.items || section.items.length === 0) return null;
          return (
            <View key={index} style={styles.bulletSection}>
              {section.items.map((item, i) => (
                <View key={i} style={styles.bulletItem}>
                  <Text style={[styles.bulletDot, { color: colors.accent }]}>•</Text>
                  <Text style={[styles.bulletText, { color: colors.subtext }]}>
                    {item}
                  </Text>
                </View>
              ))}
            </View>
          );
        
        default:
          if (!section.content || !section.content.trim()) return null;
          return (
            <Text key={index} style={[styles.regularText, { color: colors.text }]}>
              {section.content.trim()}
            </Text>
          );
      }
    };

    const sections = parseContent();
    return (
      <View>
        {sections.map((section, index) => renderSection(section, index))}
      </View>
    );
  };

  const MessageBubble = ({ message }) => {
    const isAI = message.sender === 'ai';
    
    return (
      <View
        style={[
          styles.messageBubble,
          isAI ? styles.aiMessage : styles.userMessage,
        ]}
      >
        {isAI ? (
          <View style={styles.glassContainer}>
            {/* Base solid background with opacity */}
            <View style={[
              styles.baseBackground,
              { backgroundColor: theme === 'light' ? 'rgba(255, 255, 255, 0.85)' : 'rgba(30, 30, 30, 0.85)' }
            ]} />
            
            {/* Vibrant gradient overlay */}
            <LinearGradient
              colors={theme === 'light' 
                ? ['rgba(129, 212, 250, 0.6)', 'rgba(186, 104, 200, 0.5)', 'rgba(255, 213, 79, 0.4)']
                : ['rgba(25, 118, 210, 0.5)', 'rgba(123, 31, 162, 0.45)', 'rgba(49, 27, 146, 0.4)']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientOverlay}
            />
            
            {/* Top glossy shine */}
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.4)', 'rgba(255, 255, 255, 0)']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 0.5 }}
              style={styles.glossyShine}
            />
            
            {/* Inner glow border */}
            <View style={[
              styles.innerGlow,
              { borderColor: theme === 'light' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.15)' }
            ]} />
            
            <View style={styles.messageContent}>
              <FormattedMessage text={message.text} />
              <Text
                style={[
                  styles.timestamp,
                  { color: theme === 'light' ? '#666' : '#BBB' },
                ]}
              >
                {message.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>
        ) : (
          <View style={[styles.userMessageBg, { backgroundColor: colors.accent }]}>
            <Text
              style={[
                styles.messageText,
                { color: '#FFFFFF' },
              ]}
            >
              {message.text}
            </Text>
            <Text
              style={[
                styles.timestamp,
                { color: '#FFFFFF' },
              ]}
            >
              {message.timestamp.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const QuickActionButton = ({ title, icon, onPress }) => (
    <TouchableOpacity
      style={[styles.quickActionButton, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
    >
      <Text style={styles.quickActionIcon}>{icon}</Text>
      <Text style={[styles.quickActionText, { color: colors.text }]}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.backButton, { color: colors.accent }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>AI Fitness Coach</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          <View style={styles.quickActionsContainer}>
            <Text style={[styles.quickActionsTitle, { color: colors.subtext }]}>
              Quick Actions:
            </Text>
            <View style={styles.quickActionsGrid}>
              <QuickActionButton
                title="Workout Plan"
                icon="💪"
                onPress={() => handleQuickAction('workout')}
              />
              <QuickActionButton
                title="Nutrition Tips"
                icon="🥗"
                onPress={() => handleQuickAction('nutrition')}
              />
              <QuickActionButton
                title="Quick Tip"
                icon="💡"
                onPress={() => handleQuickAction('tip')}
              />
              <QuickActionButton
                title="My Progress"
                icon="📊"
                onPress={() => handleQuickAction('progress')}
              />
            </View>
          </View>

          {messages.map(message => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={[styles.loadingText, { color: colors.subtext }]}>
                Thinking...
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.background,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask me anything..."
            placeholderTextColor={colors.subtext}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: inputText.trim() ? colors.accent : colors.border,
              },
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || loading}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  backButton: { fontSize: 16, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: 'bold' },
  messagesContainer: { flex: 1 },
  messagesContent: { padding: 20, paddingBottom: 10 },
  quickActionsContainer: { marginBottom: 20 },
  quickActionsTitle: { fontSize: 14, fontWeight: '600', marginBottom: 10 },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  quickActionIcon: { fontSize: 16, marginRight: 6 },
  quickActionText: { fontSize: 13, fontWeight: '500' },
  messageBubble: {
    maxWidth: '85%',
    marginBottom: 16,
    overflow: 'visible',
  },
  aiMessage: {
    alignSelf: 'flex-start',
  },
  userMessage: {
    alignSelf: 'flex-end',
  },
  glassContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    // Strong dramatic shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  baseBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
  },
  glossyShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  innerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    borderWidth: 2,
  },
  messageContent: {
    padding: 16,
    paddingBottom: 12,
    position: 'relative',
    zIndex: 1,
  },
  userMessageBg: {
    borderRadius: 24,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  messageText: { fontSize: 15, lineHeight: 20, marginBottom: 4 },
  timestamp: { 
    fontSize: 11, 
    opacity: 0.7, 
    marginTop: 6,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  loadingText: { marginLeft: 10, fontSize: 14 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    fontSize: 15,
    borderWidth: 1,
  },
  sendButton: {
    marginLeft: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    justifyContent: 'center',
  },
  sendButtonText: { color: 'white', fontSize: 15, fontWeight: '600' },
  
  // NEW STYLES FOR FORMATTED MESSAGES
  numberedSection: {
    flexDirection: 'row',
    marginBottom: 14,
    alignItems: 'flex-start',
  },
  numberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  numberText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  sectionContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
    lineHeight: 20,
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 19,
  },
  headerSection: {
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerContent: {
    fontSize: 14,
    lineHeight: 19,
  },
  regularText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  bulletSection: {
    marginBottom: 12,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingLeft: 8,
  },
  bulletDot: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
    lineHeight: 20,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});

export default ChatbotScreen;