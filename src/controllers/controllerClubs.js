// controllers/clubController.js
const Club = require("../models/clubs");
const User = require("../models/users");

// 🟢 Lấy tất cả CLB (hiển thị trang chủ)
const getAllClubs = async (req, res) => {
  try {
    const clubs = await Club.find({ status: "approved" })
      .populate("managerId", "name email _id")
      .select("name description category logo status createdAt managerId");

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

const addMemberToClub = async (req, res) => {
  try {
    const { clubId, userId } = req.body;

    const club = await Club.findById(clubId);
    const user = await User.findById(userId);

    if (!club) return res.status(404).json({ message: "Không tìm thấy CLB." });
    if (!user)
      return res.status(404).json({ message: "Không tìm thấy người dùng." });

    const alreadyMember = club.members.some(
      (m) => m.userId.toString() === userId
    );
    if (alreadyMember) {
      return res
        .status(400)
        .json({ message: "Người dùng đã là thành viên CLB này." });
    }

    // 3️⃣ Thêm user vào danh sách thành viên CLB
    club.members.push({ userId, joinedAt: new Date() });

    // 4️⃣ Thêm club vào danh sách CLB đã tham gia của user
    user.joinedClubs.push({ clubId, joinedAt: new Date() });

    // 5️⃣ Lưu thay đổi cả hai bên
    await club.save();
    await user.save();

    res.status(200).json({
      message: "Thêm thành viên vào CLB thành công!",
      club,
    });
  } catch (error) {
    res.status(500).json({
      message: "Lỗi server khi thêm thành viên vào CLB",
      error,
    });
  }
};
// 🟢 Lấy clubs của manager (bao gồm cả pending và approved)
const getMyClubs = async (req, res) => {
  try {
    const userId = req.user._id;
    const clubs = await Club.find({ managerId: userId })
      .populate("managerId", "name email _id")
      .select("name description category logo status createdAt managerId")
      .sort({ createdAt: -1 });

    res.status(200).json(clubs);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi lấy danh sách CLB", error });
  }
};

module.exports = {
  getAllClubs,
  getClubDetailbyId,
  createClub,
  approveClub,
  addMemberToClub,
  getMyClubs,
};
