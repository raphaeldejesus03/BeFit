// src/services/i18n.js
import i18n from "i18n-js";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Supported language codes in the app
const SUPPORTED_LANGUAGES = ["en", "vi", "tl", "fr"];

// Define translations
const translations = {
  en: {
    // Auth screens
    login: "Login",
    signUp: "Sign Up",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm Password",
    fullName: "Full Name",
    age: "Age",
    weight: "Weight (kg)",
    height: "Height (cm)",
    alreadyHaveAccount: "Already have an account?",
    dontHaveAccount: "Don't have an account?",
    // Navigation
    home: "Home",
    workout: "Workout",
    goals: "Goals",
    progress: "Progress",
    nutrition: "Nutrition",
    profile: "Profile",
    // Home Screen
    welcome: "Welcome",
    todayStats: "Today's Stats",
    waterIntake: "Water Intake",
    calories: "Calories",
    workouts: "Workouts",
    quickActions: "Quick Actions",
    logWorkout: "Log Workout",
    addMeal: "Add Meal",
    trackWater: "Track Water",
    // Workout Screen
    myWorkouts: "My Workouts",
    addWorkout: "Add Workout",
    editWorkout: "Edit Workout",
    deleteWorkout: "Delete Workout",
    exercise: "Exercise",
    type: "Type",
    duration: "Duration (min)",
    calories_burned: "Calories Burned",
    notes: "Notes",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    // Workout Types
    cardio: "Cardio",
    strength: "Strength",
    flexibility: "Flexibility",
    sports: "Sports",
    other: "Other",
    // Exercise Types
    running: "Running",
    cycling: "Cycling",
    swimming: "Swimming",
    walking: "Walking",
    pushups: "Push-ups",
    squats: "Squats",
    lunges: "Lunges",
    plank: "Plank",
    yoga: "Yoga",
    stretching: "Stretching",
    pilates: "Pilates",
    basketball: "Basketball",
    football: "Football",
    tennis: "Tennis",
    // Goals Screen
    myGoals: "My Goals",
    addGoal: "Add Goal",
    editGoal: "Edit Goal",
    goalTitle: "Goal Title",
    targetValue: "Target Value",
    currentValue: "Current Value",
    deadline: "Deadline",
    completed: "Completed",
    inProgress: "In Progress",
    // Progress Screen
    myProgress: "My Progress",
    weeklyProgress: "Weekly Progress",
    monthlyProgress: "Monthly Progress",
    totalWorkouts: "Total Workouts",
    totalDuration: "Total Duration",
    averageDuration: "Average Duration",
    // Nutrition Screen
    myNutrition: "My Nutrition",
    addMealBtn: "Add Meal",
    mealName: "Meal Name",
    mealType: "Meal Type",
    breakfast: "Breakfast",
    lunch: "Lunch",
    dinner: "Dinner",
    snack: "Snack",
    protein: "Protein (g)",
    carbs: "Carbs (g)",
    fats: "Fats (g)",
    // Profile Screen
    myProfile: "My Profile",
    editProfile: "Edit Profile",
    accountInfo: "Account Information",
    statistics: "Statistics",
    settings: "Settings",
    language: "Language",
    theme: "Theme",
    darkMode: "Dark Mode",
    lightMode: "Light Mode",
    logout: "Logout",
    joinDate: "Join Date",
    currentStreak: "Current Streak",
    days: "days",
    favoriteWorkout: "Favorite Workout",
    waterGlasses: "Water Glasses",
    changeAvatar: "Change Avatar",
    // Chatbot
    aiCoach: "AI Coach",
    askQuestion: "Ask me anything about fitness...",
    // Common
    search: "Search",
    filter: "Filter",
    sortBy: "Sort By",
    date: "Date",
    recent: "Recent",
    oldest: "Oldest",
    viewTutorial: "View Tutorial",
    watchVideo: "Watch Video",
    // Messages
    success: "Success",
    error: "Error",
    loading: "Loading...",
    noData: "No data available",
    confirmDelete: "Are you sure you want to delete this?",
    savedSuccessfully: "Saved successfully!",
    deletedSuccessfully: "Deleted successfully!",
    updateSuccessfully: "Updated successfully!",
  },
  vi: {
    // Auth screens
    login: "Đăng nhập",
    signUp: "Đăng ký",
    email: "Email",
    password: "Mật khẩu",
    confirmPassword: "Xác nhận mật khẩu",
    fullName: "Họ và tên",
    age: "Tuổi",
    weight: "Cân nặng (kg)",
    height: "Chiều cao (cm)",
    alreadyHaveAccount: "Đã có tài khoản?",
    dontHaveAccount: "Chưa có tài khoản?",
    // Navigation
    home: "Trang chủ",
    workout: "Tập luyện",
    goals: "Mục tiêu",
    progress: "Tiến độ",
    nutrition: "Dinh dưỡng",
    profile: "Hồ sơ",
    // Home Screen
    welcome: "Chào mừng",
    todayStats: "Thống kê hôm nay",
    waterIntake: "Lượng nước uống",
    calories: "Calo",
    workouts: "Bài tập",
    quickActions: "Thao tác nhanh",
    logWorkout: "Ghi nhận tập luyện",
    addMeal: "Thêm bữa ăn",
    trackWater: "Theo dõi nước",
    // Workout Screen
    myWorkouts: "Bài tập của tôi",
    addWorkout: "Thêm bài tập",
    editWorkout: "Sửa bài tập",
    deleteWorkout: "Xóa bài tập",
    exercise: "Bài tập",
    type: "Loại",
    duration: "Thời gian (phút)",
    calories_burned: "Calo đốt cháy",
    notes: "Ghi chú",
    save: "Lưu",
    cancel: "Hủy",
    delete: "Xóa",
    // Workout Types
    cardio: "Tim mạch",
    strength: "Sức mạnh",
    flexibility: "Linh hoạt",
    sports: "Thể thao",
    other: "Khác",
    // Exercise Types
    running: "Chạy bộ",
    cycling: "Đạp xe",
    swimming: "Bơi lội",
    walking: "Đi bộ",
    pushups: "Chống đẩy",
    squats: "Squats",
    lunges: "Lunges",
    plank: "Plank",
    yoga: "Yoga",
    stretching: "Giãn cơ",
    pilates: "Pilates",
    basketball: "Bóng rổ",
    football: "Bóng đá",
    tennis: "Quần vợt",
    // Goals Screen
    myGoals: "Mục tiêu của tôi",
    addGoal: "Thêm mục tiêu",
    editGoal: "Sửa mục tiêu",
    goalTitle: "Tiêu đề mục tiêu",
    targetValue: "Giá trị mục tiêu",
    currentValue: "Giá trị hiện tại",
    deadline: "Hạn chót",
    completed: "Hoàn thành",
    inProgress: "Đang thực hiện",
    // Progress Screen
    myProgress: "Tiến độ của tôi",
    weeklyProgress: "Tiến độ tuần",
    monthlyProgress: "Tiến độ tháng",
    totalWorkouts: "Tổng bài tập",
    totalDuration: "Tổng thời gian",
    averageDuration: "Thời gian trung bình",
    // Nutrition Screen
    myNutrition: "Dinh dưỡng của tôi",
    addMealBtn: "Thêm bữa ăn",
    mealName: "Tên bữa ăn",
    mealType: "Loại bữa ăn",
    breakfast: "Bữa sáng",
    lunch: "Bữa trưa",
    dinner: "Bữa tối",
    snack: "Bữa phụ",
    protein: "Protein (g)",
    carbs: "Carbs (g)",
    fats: "Chất béo (g)",
    // Profile Screen
    myProfile: "Hồ sơ của tôi",
    editProfile: "Sửa hồ sơ",
    accountInfo: "Thông tin tài khoản",
    statistics: "Thống kê",
    settings: "Cài đặt",
    language: "Ngôn ngữ",
    theme: "Giao diện",
    darkMode: "Chế độ tối",
    lightMode: "Chế độ sáng",
    logout: "Đăng xuất",
    joinDate: "Ngày tham gia",
    currentStreak: "Chuỗi hiện tại",
    days: "ngày",
    favoriteWorkout: "Bài tập yêu thích",
    waterGlasses: "Ly nước",
    changeAvatar: "Đổi ảnh đại diện",
    // Chatbot
    aiCoach: "Huấn luyện viên AI",
    askQuestion: "Hỏi tôi bất cứ điều gì về thể dục...",
    // Common
    search: "Tìm kiếm",
    filter: "Lọc",
    sortBy: "Sắp xếp theo",
    date: "Ngày",
    recent: "Gần đây",
    oldest: "Cũ nhất",
    viewTutorial: "Xem hướng dẫn",
    watchVideo: "Xem video",
    // Messages
    success: "Thành công",
    error: "Lỗi",
    loading: "Đang tải...",
    noData: "Không có dữ liệu",
    confirmDelete: "Bạn có chắc chắn muốn xóa không?",
    savedSuccessfully: "Lưu thành công!",
    deletedSuccessfully: "Xóa thành công!",
    updateSuccessfully: "Cập nhật thành công!",
  },
  tl: {
    // Auth screens
    login: "Mag-login",
    signUp: "Mag-sign up",
    email: "Email",
    password: "Password",
    confirmPassword: "Kumpirmahin ang password",
    fullName: "Buong pangalan",
    age: "Edad",
    weight: "Timbang (kg)",
    height: "Taas (cm)",
    alreadyHaveAccount: "May account ka na?",
    dontHaveAccount: "Wala ka pang account?",
    // Navigation
    home: "Home",
    workout: "Workout",
    goals: "Mga layunin",
    progress: "Progreso",
    nutrition: "Nutrisyon",
    profile: "Profile",
    // Home Screen
    welcome: "Maligayang pagdating",
    todayStats: "Mga stats ngayong araw",
    waterIntake: "Dami ng nainom na tubig",
    calories: "Calories",
    workouts: "Mga workout",
    quickActions: "Mga mabilisang aksyon",
    logWorkout: "I-log ang workout",
    addMeal: "Magdagdag ng pagkain",
    trackWater: "I-track ang tubig",
    // Workout Screen
    myWorkouts: "Mga workout ko",
    addWorkout: "Magdagdag ng workout",
    editWorkout: "I-edit ang workout",
    deleteWorkout: "I-delete ang workout",
    exercise: "Ehersisyo",
    type: "Uri",
    duration: "Tagal (minuto)",
    calories_burned: "Calories na nasunog",
    notes: "Mga tala",
    save: "I-save",
    cancel: "Kanselahin",
    delete: "I-delete",
    // Workout Types
    cardio: "Cardio",
    strength: "Lakas",
    flexibility: "Flexibility",
    sports: "Sports",
    other: "Iba pa",
    // Exercise Types
    running: "Pagtakbo",
    cycling: "Pagbibisikleta",
    swimming: "Paglangoy",
    walking: "Paglalakad",
    pushups: "Push-up",
    squats: "Squat",
    lunges: "Lunges",
    plank: "Plank",
    yoga: "Yoga",
    stretching: "Pag-uunat",
    pilates: "Pilates",
    basketball: "Basketball",
    football: "Football",
    tennis: "Tennis",
    // Goals Screen
    myGoals: "Mga layunin ko",
    addGoal: "Magdagdag ng layunin",
    editGoal: "I-edit ang layunin",
    goalTitle: "Pamagat ng layunin",
    targetValue: "Target na halaga",
    currentValue: "Kasalukuyang halaga",
    deadline: "Deadline",
    completed: "Nakumpleto",
    inProgress: "Ginagawa pa",
    // Progress Screen
    myProgress: "Progreso ko",
    weeklyProgress: "Progreso lingguhan",
    monthlyProgress: "Progreso buwanan",
    totalWorkouts: "Kabuuang workout",
    totalDuration: "Kabuuang tagal",
    averageDuration: "Karaniwang tagal",
    // Nutrition Screen
    myNutrition: "Nutrisyon ko",
    addMealBtn: "Magdagdag ng pagkain",
    mealName: "Pangalan ng pagkain",
    mealType: "Uri ng pagkain",
    breakfast: "Almusal",
    lunch: "Tanghalian",
    dinner: "Hapunan",
    snack: "Meryenda",
    protein: "Protina (g)",
    carbs: "Carbs (g)",
    fats: "Taba (g)",
    // Profile Screen
    myProfile: "Profile ko",
    editProfile: "I-edit ang profile",
    accountInfo: "Impormasyon ng account",
    statistics: "Mga istatistika",
    settings: "Mga setting",
    language: "Wika",
    theme: "Tema",
    darkMode: "Dark mode",
    lightMode: "Light mode",
    logout: "Mag-logout",
    joinDate: "Petsa ng pagsali",
    currentStreak: "Kasalukuyang streak",
    days: "araw",
    favoriteWorkout: "Paboritong workout",
    waterGlasses: "Basong tubig",
    changeAvatar: "Palitan ang avatar",
    // Chatbot
    aiCoach: "AI Coach",
    askQuestion: "Magtanong sa akin ng kahit ano tungkol sa fitness...",
    // Common
    search: "Maghanap",
    filter: "Salain",
    sortBy: "Ayusin ayon sa",
    date: "Petsa",
    recent: "Pinakabago",
    oldest: "Pinakaluma",
    viewTutorial: "Tingnan ang tutorial",
    watchVideo: "Manood ng video",
    // Messages
    success: "Tagumpay",
    error: "Error",
    loading: "Naglo-load...",
    noData: "Walang data",
    confirmDelete: "Sigurado ka bang gusto mong i-delete?",
    savedSuccessfully: "Matagumpay na na-save!",
    deletedSuccessfully: "Matagumpay na na-delete!",
    updateSuccessfully: "Matagumpay na na-update!",
  },
  fr: {
    // Auth screens
    login: "Connexion",
    signUp: "Créer un compte",
    email: "E-mail",
    password: "Mot de passe",
    confirmPassword: "Confirmer le mot de passe",
    fullName: "Nom complet",
    age: "Âge",
    weight: "Poids (kg)",
    height: "Taille (cm)",
    alreadyHaveAccount: "Vous avez déjà un compte ?",
    dontHaveAccount: "Vous n’avez pas encore de compte ?",
    // Navigation
    home: "Accueil",
    workout: "Entraînement",
    goals: "Objectifs",
    progress: "Progression",
    nutrition: "Nutrition",
    profile: "Profil",
    // Home Screen
    welcome: "Bienvenue",
    todayStats: "Statistiques du jour",
    waterIntake: "Apport en eau",
    calories: "Calories",
    workouts: "Séances",
    quickActions: "Actions rapides",
    logWorkout: "Enregistrer l’entraînement",
    addMeal: "Ajouter un repas",
    trackWater: "Suivre l’eau bue",
    // Workout Screen
    myWorkouts: "Mes entraînements",
    addWorkout: "Ajouter un entraînement",
    editWorkout: "Modifier l’entraînement",
    deleteWorkout: "Supprimer l’entraînement",
    exercise: "Exercice",
    type: "Type",
    duration: "Durée (min)",
    calories_burned: "Calories brûlées",
    notes: "Notes",
    save: "Enregistrer",
    cancel: "Annuler",
    delete: "Supprimer",
    // Workout Types
    cardio: "Cardio",
    strength: "Force",
    flexibility: "Souplesse",
    sports: "Sports",
    other: "Autre",
    // Exercise Types
    running: "Course",
    cycling: "Vélo",
    swimming: "Natation",
    walking: "Marche",
    pushups: "Pompes",
    squats: "Squats",
    lunges: "Fentes",
    plank: "Planche",
    yoga: "Yoga",
    stretching: "Étirements",
    pilates: "Pilates",
    basketball: "Basket-ball",
    football: "Football",
    tennis: "Tennis",
    // Goals Screen
    myGoals: "Mes objectifs",
    addGoal: "Ajouter un objectif",
    editGoal: "Modifier l’objectif",
    goalTitle: "Titre de l’objectif",
    targetValue: "Valeur cible",
    currentValue: "Valeur actuelle",
    deadline: "Date limite",
    completed: "Terminé",
    inProgress: "En cours",
    // Progress Screen
    myProgress: "Ma progression",
    weeklyProgress: "Progression hebdomadaire",
    monthlyProgress: "Progression mensuelle",
    totalWorkouts: "Total des entraînements",
    totalDuration: "Durée totale",
    averageDuration: "Durée moyenne",
    // Nutrition Screen
    myNutrition: "Ma nutrition",
    addMealBtn: "Ajouter un repas",
    mealName: "Nom du repas",
    mealType: "Type de repas",
    breakfast: "Petit-déjeuner",
    lunch: "Déjeuner",
    dinner: "Dîner",
    snack: "Collation",
    protein: "Protéines (g)",
    carbs: "Glucides (g)",
    fats: "Lipides (g)",
    // Profile Screen
    myProfile: "Mon profil",
    editProfile: "Modifier le profil",
    accountInfo: "Informations du compte",
    statistics: "Statistiques",
    settings: "Paramètres",
    language: "Langue",
    theme: "Thème",
    darkMode: "Mode sombre",
    lightMode: "Mode clair",
    logout: "Se déconnecter",
    joinDate: "Date d’inscription",
    currentStreak: "Série en cours",
    days: "jours",
    favoriteWorkout: "Entraînement préféré",
    waterGlasses: "Verres d’eau",
    changeAvatar: "Changer d’avatar",
    // Chatbot
    aiCoach: "Coach IA",
    askQuestion: "Posez-moi vos questions sur le fitness…",
    // Common
    search: "Rechercher",
    filter: "Filtrer",
    sortBy: "Trier par",
    date: "Date",
    recent: "Le plus récent",
    oldest: "Le plus ancien",
    viewTutorial: "Voir le tutoriel",
    watchVideo: "Regarder la vidéo",
    // Messages
    success: "Succès",
    error: "Erreur",
    loading: "Chargement...",
    noData: "Aucune donnée disponible",
    confirmDelete: "Voulez-vous vraiment supprimer ?",
    savedSuccessfully: "Enregistré avec succès !",
    deletedSuccessfully: "Supprimé avec succès !",
    updateSuccessfully: "Mis à jour avec succès !",
  },
};

// Set i18n configuration
i18n.translations = translations;
i18n.fallbacks = true;
i18n.defaultLocale = "en";

/**
 * Map device locale (e.g. "en-US", "vi-VN", "fil-PH", "fr-CA") to one of our supported codes.
 */
const mapDeviceLocaleToAppLocale = (deviceLocale) => {
  const lower = (deviceLocale || "").toLowerCase();

  if (lower.startsWith("vi")) return "vi";
  if (lower.startsWith("tl") || lower.startsWith("fil")) return "tl";
  if (lower.startsWith("fr")) return "fr";
  return "en";
};

// Function to initialize language
export const initializeLanguage = async () => {
  try {
    const savedLanguage = await AsyncStorage.getItem("userLanguage");

    if (savedLanguage && SUPPORTED_LANGUAGES.includes(savedLanguage)) {
      i18n.locale = savedLanguage;
      return;
    }

    // Get device locale from expo-localization
    const deviceLocale = Localization.locale;
    const appLocale = mapDeviceLocaleToAppLocale(deviceLocale);

    i18n.locale = appLocale;
  } catch (error) {
    console.error("Error initializing language:", error);
    i18n.locale = "en";
  }
};

// Function to change language
export const changeLanguage = async (languageCode) => {
  try {
    const lang = SUPPORTED_LANGUAGES.includes(languageCode)
      ? languageCode
      : "en";

    i18n.locale = lang;
    await AsyncStorage.setItem("userLanguage", lang);
  } catch (error) {
    console.error("Error changing language:", error);
  }
};

// Function to get current language
export const getCurrentLanguage = () => i18n.locale;

// Optional convenience wrapper: i18n.t("key")
export const t = (key, options) => i18n.t(key, options);

export default i18n;
// NOTE: This is a harmless no-op comment added for tracking purposes.
