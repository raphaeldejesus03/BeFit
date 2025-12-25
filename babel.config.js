module.exports = function(api) {
    api.cache(true);
    return {
      presets: ['babel-preset-expo'], // Đây là preset chính xác cho Expo
      plugins: [
        // Đây là plugin của chúng ta để đọc tệp .env
        ['module:react-native-dotenv', {
          moduleName: '@env',
          path: '.env',
          allowlist: null,
          safe: false,
          allowUndefined: true
        }]
      ]
    };
  };