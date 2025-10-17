// controllers/userController.js
const User = require("../models/users");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// 🟢 Đăng ký người dùng mới
const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // 1. Kiểm tra email đã tồn tại chưa
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email đã tồn tại." });
    }

    // 2. Mã hóa mật khẩu
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Tạo người dùng mới
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role, // role có thể được truyền vào hoặc để mặc định là 'student'
    });

    await newUser.save();

    res.status(201).json({
      message: "Đăng ký thành công!",
      userId: newUser._id,
      email: newUser.email,
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi đăng ký", error });
  }
};

// 🟢 Đăng nhập
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Tìm người dùng theo email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Email hoặc mật khẩu không đúng." });
    }

    // 2. So sánh mật khẩu
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Email hoặc mật khẩu không đúng." });
    }

    // 3. Tạo JSON Web Token (JWT)
    const payload = {
      id: user._id,
      name: user.name,
      role: user.role,
    };

    // ❗️ Quan trọng: Lưu 'YOUR_JWT_SECRET' trong file .env để bảo mật
    const token = jwt.sign(payload, "YOUR_JWT_SECRET", { expiresIn: "1h" });

    res.status(200).json({
      message: "Đăng nhập thành công!",
      token: `Bearer ${token}`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi đăng nhập", error });
  }
};

// 🟢 Lấy thông tin người dùng theo ID
const getUserById = async (req, res) => {
  try {
    // Dùng .select('-password') để không trả về mật khẩu
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng." });
    }
    res.status(200).json(user);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Lỗi server khi lấy thông tin người dùng", error });
  }
};


module.exports = {
  registerUser,
  loginUser,
  getUserById,
};