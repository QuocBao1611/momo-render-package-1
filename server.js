import express from "express";
import axios from "axios";
import bodyParser from "body-parser";

const app = express();
const PORT = process.env.PORT || 10000;

// 🧩 Middleware
app.use(bodyParser.json());

// 🌐 URL webhook InfinityFree (chỉnh đúng link project của bạn)
const INFINITYFREE_IPN =
  process.env.INFINITYFREE_IPN ||
  "https://techstore16.kesug.com/Web/api/order/ipn_bridge.php";

/*
|--------------------------------------------------------------------------
| Route: /webhook_momo
|--------------------------------------------------------------------------
| 📩 Nhận callback từ MoMo Sandbox
| 🔁 Forward sang InfinityFree để cập nhật trạng thái đơn hàng
| 🧠 Có log chi tiết để debug
|--------------------------------------------------------------------------
*/
app.post("/webhook_momo", async (req, res) => {
  try {
    const momoData = req.body;
    console.log("📩 MoMo callback received:", momoData);

    // 🔒 Kiểm tra có orderId không
    if (!momoData.orderId) {
      console.warn("⚠️ Missing orderId in callback!");
      return res.status(400).json({ resultCode: 98, message: "Missing orderId" });
    }

    // 📨 Gửi dữ liệu sang InfinityFree (ipn_bridge.php)
    const response = await axios.post(INFINITYFREE_IPN, momoData, {
      headers: { "Content-Type": "application/json" },
      timeout: 8000, // chờ tối đa 8 giây
    });

    console.log(`✅ Forwarded order ${momoData.orderId} → InfinityFree: ${response.status}`);

    // 📁 Ghi log để kiểm tra sau (trên Render Logs)
    console.log("📦 MoMo Payload:", JSON.stringify(momoData, null, 2));

    // ✅ Gửi phản hồi lại cho MoMo
    res.json({ resultCode: 0, message: "Forward successful" });
  } catch (err) {
    console.error("❌ Error forwarding to InfinityFree:", err.message);
    res.status(500).json({ resultCode: 99, message: "Forward failed" });
  }
});

/*
|--------------------------------------------------------------------------
| Route: /
|--------------------------------------------------------------------------
| 🧠 Kiểm tra nhanh service còn hoạt động
| GET https://momo-render-package-1.onrender.com/
|--------------------------------------------------------------------------
*/
app.get("/", (req, res) => {
  res.send(`
    <h2>✅ MoMo Render Bridge đang hoạt động!</h2>
    <p>Server chạy tại cổng: <b>${PORT}</b></p>
    <p>IPN Forward: <a href="${INFINITYFREE_IPN}" target="_blank">${INFINITYFREE_IPN}</a></p>
  `);
});

// 🚀 Khởi động server
app.listen(PORT, () => {
  console.log(`🚀 MoMo Render Bridge đang chạy tại port ${PORT}`);
});
