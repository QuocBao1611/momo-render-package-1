import express from "express";
import axios from "axios";
import bodyParser from "body-parser";

const app = express();
const PORT = process.env.PORT || 10000;

// 🧩 Middleware
app.use(bodyParser.json());

// 🌐 URL webhook InfinityFree (điểm nhận dữ liệu MoMo)
const INFINITYFREE_IPN =
  process.env.INFINITYFREE_IPN ||
  "https://techstore16.kesug.com/Web/api/order/save_momo_order.php";

/*
|--------------------------------------------------------------------------
| Route: /webhook_momo
|--------------------------------------------------------------------------
| 📩 Nhận callback từ MoMo Sandbox
| 🔁 Forward sang InfinityFree (qua form-data, tránh bị chặn JSON)
| 🧠 Có log chi tiết để debug
|--------------------------------------------------------------------------
*/
app.post("/webhook_momo", async (req, res) => {
  try {
    const momoData = req.body;
    console.log("📩 MoMo callback received:", momoData);

    if (!momoData.orderId) {
      console.warn("⚠️ Missing orderId in callback!");
      return res
        .status(400)
        .json({ resultCode: 98, message: "Missing orderId" });
    }

    // 🔁 Chuyển dữ liệu JSON thành form-data (InfinityFree không cho phép JSON)
    const formData = new URLSearchParams();
    formData.append("payload", JSON.stringify(momoData));

    // 📨 Gửi sang InfinityFree
    const response = await axios.post(INFINITYFREE_IPN, formData, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 8000,
    });

    console.log(
      `✅ Forwarded order ${momoData.orderId} → InfinityFree: ${response.status}`
    );
    console.log("📦 MoMo Payload:", JSON.stringify(momoData, null, 2));

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
| 🧠 Kiểm tra service
|--------------------------------------------------------------------------
*/
app.get("/", (req, res) => {
  res.send(`
    <h2>✅ MoMo Render Bridge đang hoạt động!</h2>
    <p>Server chạy tại cổng: <b>${PORT}</b></p>
    <p>IPN Forward (InfinityFree): 
      <a href="${INFINITYFREE_IPN}" target="_blank">${INFINITYFREE_IPN}</a>
    </p>
  `);
});

// 🚀 Khởi động server
app.listen(PORT, () => {
  console.log(`🚀 MoMo Render Bridge đang chạy tại port ${PORT}`);
});

