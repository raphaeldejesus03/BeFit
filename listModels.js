// Bạn cần có API Key từ Google AI Studio
// Lấy key tại: https://aistudio.google.com/app/apikey
const YOUR_API_KEY = 'AIzaSyD8XEiYZtyRl22bUvVdjl8pc3c38VOFXTs'; // Nhớ điền lại API Key của bạn

// Endpoint của REST API để liệt kê các mô hình
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${YOUR_API_KEY}`;

/**
 * Hàm gọi API để lấy danh sách các mô hình
 */
async function fetchModels() {
  console.log("Đang lấy danh sách mô hình...");

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    console.log("✅ Lấy danh sách thành công!\n");

    // Lặp qua từng mô hình và in thông tin
    data.models.forEach(model => {
      console.log(`=============================================`);
      console.log(`**Tên hiển thị:** ${model.displayName}`);
      console.log(`**Tên API (model.name):** ${model.name}`);
      console.log(`**Phiên bản:** ${model.version}`);

      // --- PHẦN ĐÃ SỬA LỖI ---
      // Kiểm tra xem model.description có tồn tại không
      const description = model.description 
        ? `${model.description.substring(0, 100)}...`
        : 'Không có mô tả.';
      
      console.log(`**Mô tả:** ${description}`);
      // --- KẾT THÚC PHẦN SỬA LỖI ---

      // Đây chính là "supported methods" mà bạn cần!
      console.log(`**Phương thức hỗ trợ (Supported Methods):**`);
      
      // Cũng kiểm tra luôn cho supportedGenerationMethods
      if (model.supportedGenerationMethods && model.supportedGenerationMethods.length > 0) {
        console.log(`  - ${model.supportedGenerationMethods.join('\n  - ')}`);
      } else {
        console.log('  (Không có thông tin)');
      }
      
      console.log(`---------------------------------------------`);
    });

  } catch (error) {
    console.error("❌ Đã xảy ra lỗi khi lấy mô hình:", error.message);
    if (error.message.includes('undefined')) {
        console.log("Lỗi này thường xảy ra khi một trường dữ liệu (như 'description') bị thiếu.");
    } else {
        console.log("Hãy đảm bảo API Key của bạn là chính xác và đã được kích hoạt.");
    }
  }
}

// Chạy hàm
fetchModels();