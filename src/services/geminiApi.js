// services/geminiApi.js
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

// Improved system prompt with better formatting guidelines
const getSystemPrompt = (userData) => {
  return `You are BeFit Coach, a friendly and motivating AI fitness coach for the BeFit fitness tracking app.

FORMATTING GUIDELINES (CRITICAL):
- Use numbered lists (1. **Title:** description) for action items and steps
- Start section titles with bold text: **Title:**
- Add relevant emojis to make responses engaging: 💪 🏃 🥗 💧 🎯 ⭐ 🔥
- Keep sections concise and scannable (2-4 sentences max per section)
- Use blank lines (double line break) between major sections for readability
- Bold important keywords and numbers
- NEVER use HTML tags like <br>, <b>, etc. - use plain text formatting only
- For bullet points, use asterisks (*) at the start of lines

USER PROFILE:
- Total Workouts: ${userData.totalWorkouts || 0}
- Weekly Workouts: ${userData.weeklyWorkouts || 0}
- Today's Calories: ${userData.todayCalories || 0}
- Fitness Goals: ${JSON.stringify(userData.goals || {})}

YOUR RESPONSIBILITIES:
1. Provide personalized fitness and nutrition advice
2. Suggest workouts based on user history and goals
3. Analyze progress and celebrate achievements
4. Offer motivation and encouragement
5. Answer fitness and nutrition questions accurately

RESPONSE STYLE:
- Be enthusiastic but not overwhelming
- Use "you" to make it personal
- Give specific, actionable advice
- Acknowledge user's progress and efforts
- End with motivation or a clear next step

EXAMPLE GOOD FORMAT:

Hey there! 👋 Welcome back to BeFit! I'm excited to help you smash your fitness goals. Let's get you moving!

**Your Current Stats:**
* Total Workouts: **3**
* Weekly Workouts: **0**
* Today's Calories: **0**
* Daily Water Goal: **8 glasses** 💧

1. **Hydrate, Hydrate, Hydrate:** 💧
I see you haven't logged any water today! Remember to log your meals to ensure you're fueling your body for your workouts. Let's make hitting your 8-glass water goal a priority today!

2. **Schedule Your Next Workout:** 💪
You have 0 workouts logged this week. Let's change that! I recommend you try a "Beginner Bodyweight Strength" routine for 20 minutes in the next two days.

3. **Balance Your Week:** 🎯
A great goal for you right now is 3-4 workouts per week. A balanced schedule could look like: 1 running session, 1-2 strength sessions, and 1 yoga or stretching session.

You have made an excellent start. The key now is consistency. Keep logging in, keep moving, and you will see incredible results. Let's get that first workout of the week done!

Your BeFit Coach

Keep responses concise, actionable, and motivating!`;
};

export const sendMessageToGemini = async (userMessage, userData = {}, conversationHistory = []) => {
  try {
    console.log('🔑 API Key:', GEMINI_API_KEY ? 'LOADED ✅' : 'MISSING ❌');
    
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key is not configured');
    }

    const systemPrompt = getSystemPrompt(userData);
    
    // Build conversation contents with history
    const contents = [];
    
    // Add system prompt as first user message
    contents.push({
      role: 'user',
      parts: [{ text: systemPrompt }]
    });
    
    // Add a placeholder model response to acknowledge system prompt
    contents.push({
      role: 'model',
      parts: [{ text: 'Understood! I\'m ready to be your fitness coach.' }]
    });
    
    // Add conversation history (skip the initial welcome message)
    conversationHistory.forEach(msg => {
      if (msg.sender === 'ai' && msg.id !== 1) {
        // AI message
        contents.push({
          role: 'model',
          parts: [{ text: msg.text }]
        });
      } else if (msg.sender === 'user') {
        // User message
        contents.push({
          role: 'user',
          parts: [{ text: msg.text }]
        });
      }
    });
    
    // Add current user message
    contents.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });
    
    const requestBody = {
      contents: contents,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    };

    console.log('📤 Sending request to Gemini API with', contents.length, 'messages in history...');
    
    const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('📥 Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ API Error:', JSON.stringify(errorData, null, 2));
      throw new Error(
        errorData.error?.message || 
        `API Error ${response.status}: ${errorData.error?.status || 'Unknown error'}`
      );
    }

    const data = await response.json();
    console.log('✅ Gemini response received successfully');

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response generated');
    }

    const responseText = data.candidates[0].content.parts[0].text;
    return responseText;

  } catch (error) {
    console.error('💥 Error in sendMessageToGemini:', error);
    throw error;
  }
};

export const getQuickTip = async (category = 'general') => {
  const tips = {
    general: [
      '**Stay Hydrated!** 💧\nDrink water before, during, and after your workout. Aim for at least 8 glasses daily!',
      '**Consistency Over Perfection** 🎯\nIt\'s better to do a 20-minute workout consistently than to plan a perfect 2-hour session that never happens.',
      '**Recovery Matters** 😴\nYour muscles grow during rest, not during workouts. Make sure you\'re getting 7-9 hours of sleep!',
      '**Progressive Overload** 💪\nGradually increase weight, reps, or intensity to keep seeing progress. Small improvements add up!',
      '**Nutrition is Key** 🥗\nYou can\'t out-exercise a bad diet. Focus on whole foods and adequate protein intake.',
    ],
    workout: [
      '**Warm Up Properly** 🔥\nSpend 5-10 minutes warming up to prevent injury and improve performance.',
      '**Perfect Your Form** ✅\nQuality over quantity! Proper form prevents injuries and maximizes results.',
      '**Mix It Up** 🔄\nVary your workouts to prevent plateaus and keep things interesting.',
    ],
    nutrition: [
      '**Protein Timing** 🥚\nTry to eat protein within 30-60 minutes after strength training for optimal recovery.',
      '**Meal Prep Sunday** 📦\nPrepare healthy meals for the week to stay on track with your nutrition goals.',
      '**Mindful Eating** 🧘\nPay attention to hunger cues and eat slowly. It takes 20 minutes for your brain to register fullness.',
    ],
  };

  const categoryTips = tips[category] || tips.general;
  const randomTip = categoryTips[Math.floor(Math.random() * categoryTips.length)];
  return randomTip;
};