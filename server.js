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
