// server.js
const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db.js");
const router = require("./src/routes");

dotenv.config();

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads')); // Phục vụ file tĩnh từ thư mục uploads

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Kết nối MongoDB
connectDB();

// Mount routes
app.use("/api", router);

// Route test nhanh
app.get("/", (req, res) => {
  res.send("🚀 Server is running and connected to MongoDB");
});

// Lấy port từ .env
const port = process.env.PORT || 9999;
app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
