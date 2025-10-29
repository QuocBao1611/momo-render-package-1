import express from "express";
import axios from "axios";
import bodyParser from "body-parser";

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(bodyParser.json());

// URL IPN bên InfinityFree (thay link bên dưới bằng của bạn)
const INFINITYFREE_IPN = process.env.INFINITYFREE_IPN || 
  "https://techstore16.kesug.com/Web/api/order/ipn_bridge.php";

// Route nhận callback từ MoMo
app.post("/webhook_momo", async (req, res) => {
  try {
    console.log("📩 MoMo callback received:", req.body);

    // Gửi dữ liệu sang InfinityFree
    const response = await axios.post(INFINITYFREE_IPN, req.body, {
      headers: { "Content-Type": "application/json" }
    });

    console.log("✅ Forwarded to InfinityFree:", response.status);
    res.json({ resultCode: 0, message: "Forward successful" });
  } catch (err) {
    console.error("❌ Error forwarding to InfinityFree:", err.message);
    res.status(500).json({ resultCode: 99, message: "Forward failed" });
  }
});

// Route kiểm tra trạng thái service
app.get("/", (req, res) => {
  res.send("✅ MoMo Render Bridge đang hoạt động!");
});

// Khởi động server
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
