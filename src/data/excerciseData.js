// src/data/exerciseData.js
// Exercise database with YouTube tutorial links

export const EXERCISE_CATEGORIES = {
  CARDIO: 'cardio',
  STRENGTH: 'strength',
  FLEXIBILITY: 'flexibility',
  SPORTS: 'sports',
  OTHER: 'other',
};

export const EXERCISES = [
  // CARDIO EXERCISES
  {
    id: 'running',
    name: 'Running',
    nameVi: 'Chạy bộ',
    category: EXERCISE_CATEGORIES.CARDIO,
    description: 'Outdoor or treadmill running',
    descriptionVi: 'Chạy ngoài trời hoặc máy chạy bộ',
    caloriesPerMinute: 10,
    videoUrl: 'https://www.youtube.com/watch?v=_kGESn8ArrU',
    tips: [
      'Start with proper warm-up',
      'Maintain good posture',
      'Land on midfoot',
      'Keep a steady pace',
    ],
    tipsVi: [
      'Bắt đầu với khởi động đúng cách',
      'Duy trì tư thế tốt',
      'Đáp chân vào giữa bàn chân',
      'Giữ nhịp độ đều đặn',
    ],
  },
  {
    id: 'cycling',
    name: 'Cycling',
    nameVi: 'Đạp xe',
    category: EXERCISE_CATEGORIES.CARDIO,
    description: 'Indoor or outdoor cycling',
    descriptionVi: 'Đạp xe trong nhà hoặc ngoài trời',
    caloriesPerMinute: 8,
    videoUrl: 'https://www.youtube.com/watch?v=5W6I5DrP5Q0',
    tips: [
      'Adjust seat height properly',
      'Keep core engaged',
      'Use proper gear ratios',
      'Stay hydrated',
    ],
    tipsVi: [
      'Điều chỉnh độ cao yên đúng cách',
      'Giữ cơ bụng căng',
      'Sử dụng tỷ số số đúng',
      'Giữ đủ nước',
    ],
  },
  {
    id: 'swimming',
    name: 'Swimming',
    nameVi: 'Bơi lội',
    category: EXERCISE_CATEGORIES.CARDIO,
    description: 'Full body cardio workout',
    descriptionVi: 'Bài tập tim mạch toàn thân',
    caloriesPerMinute: 11,
    videoUrl: 'https://www.youtube.com/watch?v=5HLW2AI1Ink',
    tips: [
      'Focus on breathing technique',
      'Keep body streamlined',
      'Use proper stroke technique',
      'Rest between sets',
    ],
    tipsVi: [
      'Tập trung vào kỹ thuật hít thở',
      'Giữ cơ thể thon gọn',
      'Sử dụng kỹ thuật bơi đúng',
      'Nghỉ giữa các hiệp',
    ],
  },
  {
    id: 'walking',
    name: 'Walking',
    nameVi: 'Đi bộ',
    category: EXERCISE_CATEGORIES.CARDIO,
    description: 'Low impact cardio',
    descriptionVi: 'Tim mạch tác động thấp',
    caloriesPerMinute: 4,
    videoUrl: 'https://www.youtube.com/watch?v=bxnS4դրCEs',
    tips: [
      'Maintain brisk pace',
      'Swing arms naturally',
      'Keep shoulders relaxed',
      'Walk with purpose',
    ],
    tipsVi: [
      'Duy trì nhịp độ nhanh',
      'Vung tay tự nhiên',
      'Giữ vai thư giãn',
      'Đi bộ có mục đích',
    ],
  },
  {
    id: 'jumping-rope',
    name: 'Jumping Rope',
    nameVi: 'Nhảy dây',
    category: EXERCISE_CATEGORIES.CARDIO,
    description: 'High intensity cardio',
    descriptionVi: 'Tim mạch cường độ cao',
    caloriesPerMinute: 12,
    videoUrl: 'https://www.youtube.com/watch?v=FJmRQ5iTXKE',
    tips: [
      'Jump on balls of feet',
      'Keep jumps low',
      'Rotate wrists, not arms',
      'Start slowly',
    ],
    tipsVi: [
      'Nhảy trên đầu bàn chân',
      'Giữ nhảy thấp',
      'Xoay cổ tay, không phải tay',
      'Bắt đầu từ từ',
    ],
  },

  // STRENGTH EXERCISES
  {
    id: 'pushups',
    name: 'Push-ups',
    nameVi: 'Chống đẩy',
    category: EXERCISE_CATEGORIES.STRENGTH,
    description: 'Upper body strength exercise',
    descriptionVi: 'Bài tập sức mạnh thân trên',
    caloriesPerMinute: 7,
    videoUrl: 'https://www.youtube.com/watch?v=IODxDxX7oi4',
    tips: [
      'Keep body straight',
      'Lower chest to ground',
      'Push through palms',
      'Engage core',
    ],
    tipsVi: [
      'Giữ thân thẳng',
      'Hạ ngực xuống sàn',
      'Đẩy qua lòng bàn tay',
      'Kích hoạt cơ bụng',
    ],
  },
  {
    id: 'squats',
    name: 'Squats',
    nameVi: 'Squats',
    category: EXERCISE_CATEGORIES.STRENGTH,
    description: 'Lower body strength',
    descriptionVi: 'Sức mạnh thân dưới',
    caloriesPerMinute: 6,
    videoUrl: 'https://www.youtube.com/watch?v=aclHkVaku9U',
    tips: [
      'Keep knees behind toes',
      'Lower hips back and down',
      'Keep chest up',
      'Push through heels',
    ],
    tipsVi: [
      'Giữ đầu gối sau ngón chân',
      'Hạ hông ra sau và xuống',
      'Giữ ngực lên',
      'Đẩy qua gót chân',
    ],
  },
  {
    id: 'lunges',
    name: 'Lunges',
    nameVi: 'Lunges',
    category: EXERCISE_CATEGORIES.STRENGTH,
    description: 'Leg strength and balance',
    descriptionVi: 'Sức mạnh chân và cân bằng',
    caloriesPerMinute: 6,
    videoUrl: 'https://www.youtube.com/watch?v=QOVaHwm-Q6U',
    tips: [
      'Step forward with control',
      'Keep front knee at 90°',
      'Lower back knee down',
      'Alternate legs',
    ],
    tipsVi: [
      'Bước về phía trước có kiểm soát',
      'Giữ đầu gối trước ở 90°',
      'Hạ đầu gối sau xuống',
      'Thay đổi chân',
    ],
  },
  {
    id: 'plank',
    name: 'Plank',
    nameVi: 'Plank',
    category: EXERCISE_CATEGORIES.STRENGTH,
    description: 'Core strengthening',
    descriptionVi: 'Tăng cường cơ bụng',
    caloriesPerMinute: 5,
    videoUrl: 'https://www.youtube.com/watch?v=pSHjTRCQxIw',
    tips: [
      'Keep body in straight line',
      'Engage core muscles',
      'Don\'t let hips sag',
      'Breathe steadily',
    ],
    tipsVi: [
      'Giữ cơ thể thẳng hàng',
      'Kích hoạt cơ bụng',
      'Đừng để hông chùng xuống',
      'Thở đều đặn',
    ],
  },
  {
    id: 'pullups',
    name: 'Pull-ups',
    nameVi: 'Kéo xà',
    category: EXERCISE_CATEGORIES.STRENGTH,
    description: 'Upper body and back strength',
    descriptionVi: 'Sức mạnh thân trên và lưng',
    caloriesPerMinute: 8,
    videoUrl: 'https://www.youtube.com/watch?v=eGo4IYlbE5g',
    tips: [
      'Start from dead hang',
      'Pull chin over bar',
      'Lower with control',
      'Keep core tight',
    ],
    tipsVi: [
      'Bắt đầu từ treo thẳng',
      'Kéo cằm qua thanh',
      'Hạ xuống có kiểm soát',
      'Giữ cơ bụng căng',
    ],
  },

  // FLEXIBILITY EXERCISES
  {
    id: 'yoga',
    name: 'Yoga',
    nameVi: 'Yoga',
    category: EXERCISE_CATEGORIES.FLEXIBILITY,
    description: 'Mind-body practice',
    descriptionVi: 'Thực hành tinh thần-cơ thể',
    caloriesPerMinute: 3,
    videoUrl: 'https://www.youtube.com/watch?v=v7AYKMP6rOE',
    tips: [
      'Focus on breathing',
      'Move with intention',
      'Listen to your body',
      'Hold poses mindfully',
    ],
    tipsVi: [
      'Tập trung vào hơi thở',
      'Di chuyển có ý thức',
      'Lắng nghe cơ thể',
      'Giữ tư thế có ý thức',
    ],
  },
  {
    id: 'stretching',
    name: 'Stretching',
    nameVi: 'Giãn cơ',
    category: EXERCISE_CATEGORIES.FLEXIBILITY,
    description: 'Flexibility and mobility',
    descriptionVi: 'Linh hoạt và di động',
    caloriesPerMinute: 2,
    videoUrl: 'https://www.youtube.com/watch?v=g_tea8ZNk5A',
    tips: [
      'Hold stretches 20-30 seconds',
      'Don\'t bounce',
      'Breathe deeply',
      'Stretch both sides',
    ],
    tipsVi: [
      'Giữ giãn cơ 20-30 giây',
      'Đừng nảy',
      'Thở sâu',
      'Giãn cả hai bên',
    ],
  },
  {
    id: 'pilates',
    name: 'Pilates',
    nameVi: 'Pilates',
    category: EXERCISE_CATEGORIES.FLEXIBILITY,
    description: 'Core and flexibility training',
    descriptionVi: 'Tập luyện cơ bụng và linh hoạt',
    caloriesPerMinute: 4,
    videoUrl: 'https://www.youtube.com/watch?v=K56Z12XNQ40',
    tips: [
      'Engage deep core muscles',
      'Focus on precision',
      'Control movements',
      'Breathe with exercises',
    ],
    tipsVi: [
      'Kích hoạt cơ bụng sâu',
      'Tập trung vào độ chính xác',
      'Kiểm soát chuyển động',
      'Thở theo bài tập',
    ],
  },

  // SPORTS
  {
    id: 'basketball',
    name: 'Basketball',
    nameVi: 'Bóng rổ',
    category: EXERCISE_CATEGORIES.SPORTS,
    description: 'Team sport with cardio',
    descriptionVi: 'Thể thao đồng đội với tim mạch',
    caloriesPerMinute: 9,
    videoUrl: 'https://www.youtube.com/watch?v=0zkz6djMHIc',
    tips: [
      'Practice dribbling',
      'Work on shooting form',
      'Stay in defensive stance',
      'Communicate with team',
    ],
    tipsVi: [
      'Luyện tập rê bóng',
      'Làm việc trên hình thức bắn',
      'Ở trong tư thế phòng thủ',
      'Giao tiếp với đội',
    ],
  },
  {
    id: 'football',
    name: 'Football/Soccer',
    nameVi: 'Bóng đá',
    category: EXERCISE_CATEGORIES.SPORTS,
    description: 'The beautiful game',
    descriptionVi: 'Trò chơi đẹp',
    caloriesPerMinute: 9,
    videoUrl: 'https://www.youtube.com/watch?v=0A39VKSxyV8',
    tips: [
      'Control the ball',
      'Keep head up',
      'Pass accurately',
      'Maintain stamina',
    ],
    tipsVi: [
      'Kiểm soát bóng',
      'Giữ đầu lên',
      'Chuyền chính xác',
      'Duy trì sức bền',
    ],
  },
  {
    id: 'tennis',
    name: 'Tennis',
    nameVi: 'Quần vợt',
    category: EXERCISE_CATEGORIES.SPORTS,
    description: 'Racket sport',
    descriptionVi: 'Thể thao vợt',
    caloriesPerMinute: 8,
    videoUrl: 'https://www.youtube.com/watch?v=QTAwUrx6c8k',
    tips: [
      'Use proper grip',
      'Follow through on swings',
      'Move feet quickly',
      'Watch the ball',
    ],
    tipsVi: [
      'Sử dụng cách cầm đúng',
      'Hoàn thành cú swing',
      'Di chuyển chân nhanh',
      'Quan sát bóng',
    ],
  },
];

// Helper function to get exercise by ID
export const getExerciseById = (id) => {
  return EXERCISES.find(exercise => exercise.id === id);
};

// Helper function to get exercises by category
export const getExercisesByCategory = (category) => {
  return EXERCISES.filter(exercise => exercise.category === category);
};

// Helper function to get all exercise names for dropdown
export const getExerciseNames = (language = 'en') => {
  return EXERCISES.map(exercise => ({
    id: exercise.id,
    name: language === 'vi' ? exercise.nameVi : exercise.name,
  }));
};

// Helper function to search exercises
export const searchExercises = (searchTerm, language = 'en') => {
  const term = searchTerm.toLowerCase();
  return EXERCISES.filter(exercise => {
    const name = language === 'vi' ? exercise.nameVi : exercise.name;
    const description = language === 'vi' ? exercise.descriptionVi : exercise.description;
    return name.toLowerCase().includes(term) || description.toLowerCase().includes(term);
  });
};
