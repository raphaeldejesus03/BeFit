/**
 * Exercise API Service
 * Handles all interactions with API Ninjas Exercise API
 * Documentation: https://api-ninjas.com/api/exercises
 */

const API_NINJAS_KEY = '0c2EUIYPnDuqEqKOM8A6uYLKwGNRo2JZC6YjEsd6';
const BASE_URL = 'https://api.api-ninjas.com/v1/exercises';


export const searchExercisesByName = async (name) => {
  try {
    if (!name || name.trim().length < 2) {
      return [];
    }

    const response = await fetch(`${BASE_URL}?name=${encodeURIComponent(name)}`, {
      method: 'GET',
      headers: {
        'X-Api-Key': API_NINJAS_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error searching exercises by name:', error);
    throw error;
  }
};

export const searchExercisesByMuscle = async (muscle) => {
  try {
    const response = await fetch(`${BASE_URL}?muscle=${encodeURIComponent(muscle)}`, {
      method: 'GET',
      headers: {
        'X-Api-Key': API_NINJAS_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error searching exercises by muscle:', error);
    throw error;
  }
};

export const searchExercisesByType = async (type) => {
  try {
    const response = await fetch(`${BASE_URL}?type=${encodeURIComponent(type)}`, {
      method: 'GET',
      headers: {
        'X-Api-Key': API_NINJAS_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error searching exercises by type:', error);
    throw error;
  }
};

export const searchExercisesByDifficulty = async (difficulty) => {
  try {
    const response = await fetch(`${BASE_URL}?difficulty=${encodeURIComponent(difficulty)}`, {
      method: 'GET',
      headers: {
        'X-Api-Key': API_NINJAS_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error searching exercises by difficulty:', error);
    throw error;
  }
};

export const searchExercisesWithFilters = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams();

    if (filters.name) queryParams.append('name', filters.name);
    if (filters.type) queryParams.append('type', filters.type);
    if (filters.muscle) queryParams.append('muscle', filters.muscle);
    if (filters.difficulty) queryParams.append('difficulty', filters.difficulty);
    if (filters.offset) queryParams.append('offset', filters.offset);

    const url = `${BASE_URL}?${queryParams.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Api-Key': API_NINJAS_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error searching exercises with filters:', error);
    throw error;
  }
};

export const getRandomExercises = async (count = 5, type = null) => {
  try {
    const url = type ? `${BASE_URL}?type=${type}` : BASE_URL;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Api-Key': API_NINJAS_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Shuffle and return requested count
    const shuffled = data.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, 10));
  } catch (error) {
    console.error('Error getting random exercises:', error);
    throw error;
  }
};

export const MUSCLE_GROUPS = [
  'abdominals',
  'abductors',
  'adductors',
  'biceps',
  'calves',
  'chest',
  'forearms',
  'glutes',
  'hamstrings',
  'lats',
  'lower_back',
  'middle_back',
  'neck',
  'quadriceps',
  'traps',
  'triceps',
];

export const EXERCISE_TYPES = [
  'cardio',
  'olympic_weightlifting',
  'plyometrics',
  'powerlifting',
  'strength',
  'stretching',
  'strongman',
];

export const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'expert'];


export const getTypeColor = (type) => {
  const typeColors = {
    cardio: '#FF6B6B',
    strength: '#4ECDC4',
    powerlifting: '#A463F2',
    olympic_weightlifting: '#FFD93D',
    plyometrics: '#FF8C42',
    stretching: '#95E1D3',
    strongman: '#6C5CE7',
  };
  return typeColors[type] || '#6366F1';
};

export const getDifficultyColor = (difficulty) => {
  const difficultyColors = {
    beginner: '#4ADE80',
    intermediate: '#FBBF24',
    expert: '#F87171',
  };
  return difficultyColors[difficulty] || '#9CA3AF';
};

export const formatExerciseName = (name) => {
  return name
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const isAPIKeyConfigured = () => {
  return API_NINJAS_KEY !== 'YOUR_API_KEY_HERE' && API_NINJAS_KEY.length > 0;
};

export default {
  searchExercisesByName,
  searchExercisesByMuscle,
  searchExercisesByType,
  searchExercisesByDifficulty,
  searchExercisesWithFilters,
  getRandomExercises,
  MUSCLE_GROUPS,
  EXERCISE_TYPES,
  DIFFICULTY_LEVELS,
  getTypeColor,
  getDifficultyColor,
  formatExerciseName,
  isAPIKeyConfigured,
};