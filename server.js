import express from "express";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";

const app = express();
const PORT = process.env.PORT || 10000;

app.use(bodyParser.json());

// 📁 Thư mục và file lưu log/đơn hàng
const LOG_DIR = path.resolve("./backup_logs");
const ORDER_FILE = path.join(LOG_DIR, "orders_log.json");
const LOG_FILE = path.join(LOG_DIR, "backup_log.txt");

// 🔧 Tạo sẵn thư mục và file nếu chưa có
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR);
if (!fs.existsSync(ORDER_FILE)) fs.writeFileSync(ORDER_FILE, "[]", "utf-8");

function log(message) {
  const line = `[${new Date().toLocaleString("vi-VN")}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, line);
  console.log(message);
}

/*
|--------------------------------------------------------------------------
| 📦 Route: /webhook_momo (callback thật hoặc test)
|--------------------------------------------------------------------------
| Mô phỏng webhook MoMo gọi về server sau khi thanh toán thành công.
| Server sẽ tạo đơn hàng mới vào file JSON.
*/
app.post("/webhook_momo", (req, res) => {
  const data = req.body;
  log("📩 Nhận dữ liệu từ MoMo:");
  log(JSON.stringify(data, null, 2));

  if (!data.orderId) {
    log("❌ Thiếu orderId!");
    return res.status(400).json({ resultCode: 99, message: "Thiếu orderId" });
  }

  if (data.resultCode !== 0) {
    log(`⚠️ Thanh toán thất bại: Code=${data.resultCode}`);
    return res.json({ resultCode: 1002, message: "Payment failed" });
  }

  let userId = 0;
  if (data.extraData && data.extraData.includes("uid=")) {
    userId = parseInt(data.extraData.split("=")[1]);
  }

  const orders = JSON.parse(fs.readFileSync(ORDER_FILE, "utf-8"));
  const exists = orders.find((o) => o.momo_transaction_id === data.orderId);
  if (exists) {
    log(`⚠️ Đơn ${data.orderId} đã tồn tại — bỏ qua.`);
    return res.json({ resultCode: 0, message: "Already processed" });
  }

  const newOrder = {
    id: orders.length + 1,
    user_id: userId || 0,
    momo_transaction_id: data.orderId,
    amount: data.amount || 0,
    status: "Đã thanh toán - MoMo (Demo)",
    created_at: new Date().toLocaleString("vi-VN"),
  };

  orders.push(newOrder);
  fs.writeFileSync(ORDER_FILE, JSON.stringify(orders, null, 2), "utf-8");
  log(`✅ Tạo đơn hàng #${newOrder.id} | TX=${data.orderId} | User=${userId}`);

  res.json({ resultCode: 0, message: "Confirm Success" });
});

/*
|--------------------------------------------------------------------------
| 🧪 Route: /test — Tạo đơn hàng giả lập (demo cho báo cáo)
|--------------------------------------------------------------------------
| Khi bạn mở link này, server sẽ tự tạo 1 callback giống như MoMo gửi thật.
*/
app.get("/test", (req, res) => {
  const fakeData = {
    orderId: "DEMO_" + Date.now(),
    resultCode: 0,
    amount: Math.floor(Math.random() * 100000) + 10000,
    extraData: "uid=1",
  };

  // Gửi request nội bộ tới /webhook_momo
  fetch(`http://localhost:${PORT}/webhook_momo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fakeData),
  })
    .then(() => {
      log("🧪 Tạo đơn demo thành công!");
      res.send(`
        <h3 style="color:green">✅ Tạo đơn demo thành công!</h3>
        <p>Kiểm tra danh sách đơn tại: <a href="/orders" target="_blank">/orders</a></p>
      `);
    })
    .catch((err) => {
      log("❌ Lỗi khi tạo đơn demo: " + err.message);
      res.send(`<h3 style="color:red">❌ Lỗi tạo đơn demo: ${err.message}</h3>`);
    });
});

/*
|--------------------------------------------------------------------------
| 📋 Route: /orders — Xem danh sách đơn hàng đã tạo
|--------------------------------------------------------------------------
*/
app.get("/orders", (req, res) => {
  const orders = JSON.parse(fs.readFileSync(ORDER_FILE, "utf-8"));
  res.send(`
    <h2>📦 Danh sách đơn hàng (Backup Demo)</h2>
    <p>Tổng số: ${orders.length} đơn</p>
    <pre>${JSON.stringify(orders, null, 2)}</pre>
    <a href="/">⬅️ Quay lại trang chính</a>
  `);
});

/*
|--------------------------------------------------------------------------
| 🏠 Route: / — Trang chính của server
|--------------------------------------------------------------------------
*/
app.get("/", (req, res) => {
  res.send(`
    <h2>✅ MoMo Backup Server đang hoạt động!</h2>
    <p>Server đang chạy tại cổng: <b>${PORT}</b></p>
    <p>📡 Webhook: <code>/webhook_momo</code></p>
    <p>🧪 Tạo đơn hàng demo: <a href="/test" target="_blank">/test</a></p>
    <p>📦 Xem danh sách đơn hàng: <a href="/orders" target="_blank">/orders</a></p>
  `);
});

/*
|--------------------------------------------------------------------------
| 🚀 Khởi động server
|--------------------------------------------------------------------------
*/
app.listen(PORT, () => {
  log(`🚀 Backup server chạy tại port ${PORT}`);
});
