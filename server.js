import express from "express";
import axios from "axios";
import bodyParser from "body-parser";
import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";

const app = express();
const PORT = process.env.PORT || 10000;
app.use(bodyParser.json());

// 🧩 Thông tin DB InfinityFree
const DB_CONFIG = {
  host: "sql204.infinityfree.com",
  user: "if0_40213383",
  password: "A3mukVTmOc2r",
  database: "if0_40213383_phone_store",
  port: 3306,
};

// 📂 Log file Render
const LOG_FILE = path.resolve("./momo_render_log.txt");
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(LOG_FILE, line);
  console.log(msg);
}

/*
|--------------------------------------------------------------------------
| Route: /webhook_momo — MoMo Sandbox callback
|--------------------------------------------------------------------------
*/
app.post("/webhook_momo", async (req, res) => {
  const data = req.body;
  log("📩 MoMo callback received:\n" + JSON.stringify(data, null, 2));

  // ✅ Kiểm tra hợp lệ
  if (!data.orderId || data.resultCode !== 0) {
    log("⚠️ Invalid or failed payment.");
    return res.json({ resultCode: 99, message: "Invalid payload or failed payment" });
  }

  try {
    // 📦 Lấy userId từ extraData
    let userId = 0;
    if (data.extraData) {
      const parts = data.extraData.split("=");
      if (parts[0] === "uid") userId = parseInt(parts[1]);
    }
    if (!userId) {
      log("⚠️ Missing userId in extraData");
      return res.json({ resultCode: 98, message: "Missing userId" });
    }

    // 🧠 Kết nối database InfinityFree
    const conn = await mysql.createConnection(DB_CONFIG);
    log("🔌 Connected to InfinityFree DB.");

    // 🔍 Tránh xử lý trùng
    const [exists] = await conn.execute(
      "SELECT 1 FROM orders WHERE momo_transaction_id = ?",
      [data.orderId]
    );
    if (exists.length > 0) {
      log(`⚠️ Duplicate callback for ${data.orderId}`);
      await conn.end();
      return res.json({ resultCode: 0, message: "Already processed" });
    }

    // 🛒 Lấy giỏ hàng người dùng
    const [cartItems] = await conn.execute(
      `SELECT c.product_id, c.quantity, p.price 
       FROM cart c JOIN products p ON c.product_id = p.id 
       WHERE c.user_id = ?`,
      [userId]
    );

    if (cartItems.length === 0) {
      log(`⚠️ Cart empty for user #${userId}`);
      await conn.end();
      return res.json({ resultCode: 1000, message: "Empty cart" });
    }

    // 🧾 Tạo đơn hàng
    const [orderResult] = await conn.execute(
      `INSERT INTO orders (user_id, total_amount, status, payment_method, momo_transaction_id, payment_status, payment_time)
       VALUES (?, ?, 'Đã thanh toán - MoMo', 'MoMo', ?, 'paid', NOW())`,
      [userId, data.amount, data.orderId]
    );
    const orderId = orderResult.insertId;
    log(`✅ Created order #${orderId} for user #${userId}`);

    // 💾 Thêm chi tiết đơn hàng
    for (const item of cartItems) {
      await conn.execute(
        `INSERT INTO order_details (order_id, product_id, quantity, price, payment_status)
         VALUES (?, ?, ?, ?, 'paid')`,
        [orderId, item.product_id, item.quantity, item.price]
      );
    }

    // 🧹 Xóa giỏ hàng
    await conn.execute(`DELETE FROM cart WHERE user_id = ?`, [userId]);

    await conn.end();
    log(`🧾 Order #${orderId} processed successfully.`);
    return res.json({ resultCode: 0, message: "Confirm Success" });
  } catch (err) {
    log("❌ Database error: " + err.message);
    return res.json({ resultCode: 500, message: "DB Error" });
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
    <p>Server chạy tại cổng: <b>${PORT}</b></p>
    <p>Webhook này ghi trực tiếp vào DB InfinityFree.</p>
  `);
});

app.listen(PORT, () => {
  console.log(`🚀 MoMo Render Bridge đang chạy tại port ${PORT}`);
  log("🚀 Server started on Render");
});
