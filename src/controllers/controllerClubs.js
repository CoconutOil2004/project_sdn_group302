// controllers/clubController.js
const Club = require("../models/clubs");
const User = require("../models/users");

// 🟢 Lấy tất cả CLB (hiển thị trang chủ)
const getAllClubs = async (req, res) => {
  try {
    const clubs = await Club.find({ status: "approved" })
      .populate("managerId", "name email")
      .select("name description category logo status createdAt");

    res.status(200).json(clubs);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Lỗi server khi lấy danh sách CLB", error });
  }
};

// 🟢 Lấy chi tiết 1 CLB theo ID
const getClubDetailbyId = async (req, res) => {
  try {
    const club = await Club.findById(req.params.id)
      .populate("managerId", "name email")
      .populate("members.userId", "name email");

    if (!club) return res.status(404).json({ message: "Không tìm thấy CLB" });

    res.status(200).json(club);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Lỗi server khi lấy thông tin CLB", error });
  }
};

// 🟢 Tạo CLB mới (chỉ Manager được tạo)
const createClub = async (req, res) => {
  try {
    const { name, description, category, managerId } = req.body;

    const newClub = new Club({
      name,
      description,
      category,
      managerId,
      status: "pending", // admin sẽ duyệt
    });

    await newClub.save();
    res
      .status(201)
      .json({ message: "Tạo CLB thành công, chờ duyệt!", newClub });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi tạo CLB", error });
  }
};

// 🟢 Admin phê duyệt CLB
const approveClub = async (req, res) => {
  try {
    const club = await Club.findByIdAndUpdate(
      req.params.id,
      { status: "approved" },
      { new: true }
    );
    res.status(200).json({ message: "Đã duyệt CLB!", club });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi duyệt CLB", error });
  }
};
module.exports = { getAllClubs, getClubDetailbyId };
