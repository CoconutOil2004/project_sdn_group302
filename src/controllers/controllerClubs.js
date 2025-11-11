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
    const creatorId = managerId || (req.user?._id ?? managerId);

    // ✅ Lấy URL từ file upload Cloudinary
    const logoUrl = req.file?.path || "";

    const newClub = new Club({
      name,
      description,
      category,
      logo: logoUrl, // dùng ảnh từ Cloudinary
      managerId: creatorId,
      members: [{ userId: creatorId, joinedAt: new Date() }],
      status: "pending",
    });

    await newClub.save();

    if (creatorId) {
      const user = await User.findById(creatorId);
      if (user) {
        const alreadyInList = user.joinedClubs.some(
          (c) => c.clubId.toString() === newClub._id.toString()
        );
        if (!alreadyInList) {
          user.joinedClubs.push({ clubId: newClub._id, joinedAt: new Date() });
          await user.save();
        }
      }
    }

    res.status(201).json({
      message: "Tạo CLB thành công, chờ duyệt!",
      newClub,
    });
  } catch (error) {
    const status = error?.name === "ValidationError" ? 400 : 500;
    res
      .status(status)
      .json({ message: "Lỗi khi tạo CLB", error: error.message });
  }
};

const updateClub = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category } = req.body;

    const club = await Club.findById(id);
    if (!club) {
      return res.status(404).json({ message: "Không tìm thấy CLB" });
    }

    // ✅ Nếu có file upload, lấy URL Cloudinary
    const newLogo = req.file ? req.file.path : club.logo;

    club.name = name || club.name;
    club.description = description || club.description;
    club.category = category || club.category;
    club.logo = newLogo;

    await club.save();

    res.status(200).json({
      message: "Cập nhật CLB thành công",
      club,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Lỗi khi cập nhật CLB", error: err.message });
  }
};

const deleteClub = async (req, res) => {
  try {
    const clubId = req.params.id;
    const club = await Club.findById(clubId);
    if (!club) return res.status(404).json({ message: "Không tìm thấy CLB" });

    const isOwner =
      req.user && club.managerId.toString() === req.user._id.toString();
    const isAdmin = req.user && req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Không có quyền xóa CLB này" });
    }

    await Club.findByIdAndDelete(clubId);
    res.status(200).json({ message: "Đã xóa CLB" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi xóa CLB", error });
  }
};

// 🟢 Admin phê duyệt CLB và promote user thành manager nếu cần
const approveClub = async (req, res) => {
  try {
    const club = await Club.findById(req.params.id);
    if (!club) {
      return res.status(404).json({ message: "Không tìm thấy CLB" });
    }

    club.status = "approved";
    await club.save();

    // Promote managerId user to role 'manager' nếu chưa phải
    if (club.managerId) {
      const managerUser = await User.findById(club.managerId);
      if (
        managerUser &&
        managerUser.role !== "manager" &&
        managerUser.role !== "admin"
      ) {
        managerUser.role = "manager";
        await managerUser.save();
      }
    }

    res.status(200).json({ message: "Đã duyệt CLB!", club });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi duyệt CLB", error });
  }
};

// 🟠 Admin từ chối CLB
const rejectClub = async (req, res) => {
  try {
    const club = await Club.findByIdAndUpdate(
      req.params.id,
      { status: "rejected" },
      { new: true }
    );
    if (!club) {
      return res.status(404).json({ message: "Không tìm thấy CLB" });
    }
    res.status(200).json({ message: "Đã từ chối CLB!", club });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi từ chối CLB", error });
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
    res
      .status(500)
      .json({ message: "Lỗi server khi lấy danh sách CLB", error });
  }
};

// 🟢 Lấy danh sách CLB người dùng đã tham gia
const getMyMemberClubs = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate(
      "joinedClubs.clubId",
      "name logo category status managerId"
    );

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng." });
    }

    const clubs =
      user.joinedClubs
        ?.filter((entry) => entry && entry.clubId)
        .map((entry) => ({
          _id: entry.clubId._id,
          name: entry.clubId.name,
          logo: entry.clubId.logo,
          category: entry.clubId.category,
          status: entry.clubId.status,
          managerId: entry.clubId.managerId,
          joinedAt: entry.joinedAt,
        })) || [];

    res.status(200).json({ success: true, data: clubs });
  } catch (error) {
    res.status(500).json({
      message: "Lỗi server khi lấy danh sách CLB đã tham gia",
      error,
    });
  }
};

// 🟢 Lấy danh sách thành viên CLB (chỉ cho admin/manager/thành viên)
const getClubMembers = async (req, res) => {
  try {
    const clubId = req.params.id;
    const club = await Club.findById(clubId)
      .populate("members.userId", "name email avatar role status")
      .select("name logo managerId members");

    if (!club) {
      return res.status(404).json({ message: "Không tìm thấy CLB." });
    }

    const requesterId = req.user && req.user._id;
    const isAdmin = req.user?.role === "admin";
    const isManager =
      requesterId &&
      club.managerId &&
      club.managerId.toString() === requesterId.toString();
    const isMember = club.members.some(
      (member) =>
        member.userId &&
        member.userId._id &&
        requesterId &&
        member.userId._id.toString() === requesterId.toString()
    );

    if (!isAdmin && !isManager && !isMember) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền xem thành viên của CLB này." });
    }

    let members = club.members
      .filter((member) => member.userId)
      .map((member) => ({
        _id: member.userId._id,
        name: member.userId.name,
        email: member.userId.email,
        avatar: member.userId.avatar,
        role: member.userId.role,
        status: member.userId.status,
        joinedAt: member.joinedAt,
      }));

    if (
      club.managerId &&
      !members.some((member) => member._id.toString() === club.managerId.toString())
    ) {
      const managerUser = await User.findById(club.managerId).select(
        "name email avatar role status"
      );
      if (managerUser) {
        members = [
          {
            _id: managerUser._id,
            name: managerUser.name,
            email: managerUser.email,
            avatar: managerUser.avatar,
            role: managerUser.role,
            status: managerUser.status,
            joinedAt: null,
          },
          ...members,
        ];
      }
    }

    res.status(200).json({
      success: true,
      data: {
        club: {
          _id: club._id,
          name: club.name,
          logo: club.logo,
        },
        members,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Lỗi server khi lấy danh sách thành viên CLB", error });
  }
};

// 🟢 Admin lấy danh sách CLB với filter theo status
const getClubsForAdmin = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }
    const clubs = await Club.find(filter)
      .populate("managerId", "name email _id")
      .select("name description category logo status createdAt managerId")
      .sort({ createdAt: -1 });
    res.status(200).json(clubs);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Lỗi server khi lấy danh sách CLB (admin)", error });
  }
};

module.exports = {
  getAllClubs,
  getClubDetailbyId,
  createClub,
  approveClub,
  rejectClub,
  addMemberToClub,
  getMyClubs,
  getClubsForAdmin,
  updateClub,
  deleteClub,
  getMyMemberClubs,
  getClubMembers,
};
