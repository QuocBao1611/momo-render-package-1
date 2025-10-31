import express from "express";
import axios from "axios";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";

const app = express();
const PORT = process.env.PORT || 10000;

// 🧩 Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// 🌐 URL webhook InfinityFree
const INFINITYFREE_IPN = "https://techstore16.kesug.com/Web/api/order/ipn_bridge.php";

// 📂 Log file để debug (Render có thể xem qua "Logs" tab)
const LOG_FILE = path.resolve("./momo_render_log.txt");

// 🧰 Hàm ghi log an toàn
function logToFile(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, line);
  console.log(message);
}

/*
|--------------------------------------------------------------------------
| Route: /webhook_momo (callback từ MoMo)
|--------------------------------------------------------------------------
*/
app.post("/webhook_momo", async (req, res) => {
  try {
    const momoData = req.body;

    logToFile("📩 [CALLBACK] Dữ liệu nhận từ MoMo:");
    logToFile(JSON.stringify(momoData, null, 2));

    if (!momoData || !momoData.orderId) {
      logToFile("⚠️ Thiếu orderId trong payload!");
      return res.status(400).json({ resultCode: 98, message: "Thiếu orderId" });
    }

    // 📨 Forward sang InfinityFree
    try {
      const response = await axios.post(INFINITYFREE_IPN, momoData, {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
      });

      logToFile(
        `✅ Đã forward orderId=${momoData.orderId} → InfinityFree [${response.status}]`
      );
      logToFile("📦 Phản hồi từ InfinityFree:");
      logToFile(JSON.stringify(response.data, null, 2));

      // ✅ Phản hồi lại cho MoMo
      return res.json({ resultCode: 0, message: "Forward success" });
    } catch (err) {
      logToFile(`❌ Lỗi khi gửi tới InfinityFree: ${err.message}`);
      return res
        .status(502)
        .json({ resultCode: 99, message: "Forward failed", error: err.message });
    }
  } catch (err) {
    logToFile(`💥 Lỗi nội bộ webhook: ${err.message}`);
    return res.status(500).json({ resultCode: 500, message: "Internal error" });
  }
});

/*
|--------------------------------------------------------------------------
| Route: /test (giả lập request MoMo)
|--------------------------------------------------------------------------
| Dùng để bạn test thử mà không cần thanh toán thật
| Gửi JSON mẫu để xem log và xác nhận InfinityFree nhận được.
*/
app.get("/test", async (req, res) => {
  const sample = {
    partnerCode: "MOMO3Z3T20251027_TEST",
    orderId: "TEST_" + Date.now(),
    amount: 2000,
    resultCode: 0,
    message: "Thanh toán thành công (TEST)",
  };

  try {
    const response = await axios.post(INFINITYFREE_IPN, sample, {
      headers: { "Content-Type": "application/json" },
    });
    logToFile("🧪 [TEST] Gửi thử tới InfinityFree thành công!");
    logToFile(JSON.stringify(response.data, null, 2));
    res.send("<h3>✅ Test gửi dữ liệu mẫu tới InfinityFree thành công!</h3>");
  } catch (err) {
    logToFile("❌ [TEST] Gửi thất bại: " + err.message);
    res.send("<h3 style='color:red'>❌ Test thất bại: " + err.message + "</h3>");
  }
});

/*
|--------------------------------------------------------------------------
| Route: /
|--------------------------------------------------------------------------
*/
app.get("/", (req, res) => {
  res.send(`
    <h2>✅ MoMo Render Bridge đang hoạt động!</h2>
    <p>Server đang chạy tại cổng: <b>${PORT}</b></p>
    <p>Forward webhook đến: <a href="${INFINITYFREE_IPN}" target="_blank">${INFINITYFREE_IPN}</a></p>
    <p>📄 <a href="/test" target="_blank">/test</a> – gửi thử dữ liệu mẫu đến InfinityFree</p>
  `);
});

/*
|--------------------------------------------------------------------------
| Khởi động server
|--------------------------------------------------------------------------
*/
app.listen(PORT, () => {
  console.log(`🚀 MoMo Render Bridge đang chạy tại port ${PORT}`);
  logToFile(`🚀 Server khởi động tại cổng ${PORT}`);
});
