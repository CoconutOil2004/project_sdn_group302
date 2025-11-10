const Notification = require("../models/notifications");

/**
 * @desc    Lấy tất cả notification của người dùng đang đăng nhập
 * @route   GET /api/notifications
 * @access  Private
 */
const getNotifications = async (req, res) => {
<<<<<<< HEAD
  try {
    const userId = req.user.id;
=======
<<<<<<< Updated upstream
    try {
        const userId = req.user.id;
=======
  try {
    const userId = req.user._id;
>>>>>>> Stashed changes
>>>>>>> 5a2097e (feat(notification): Tích hợp thông báo và gửi email)

    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .populate("userId", "name avatar");

    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    console.error("Error getting notifications:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/**
 * @desc    Lấy số lượng thông báo chưa đọc 
 * @route   GET /api/notifications/unread-count
 * @access  Private
 */
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;

    const count = await Notification.countDocuments({ 
      userId, 
      isRead: false 
    });

    res.status(200).json({
      success: true,
      data: { count }
    });
  } catch (error) {
    console.error("Error getting unread count:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/**
 * @desc    Đánh dấu một notification là đã đọc (Fail notification)
 * @route   PATCH /api/notifications/:id/read
 * @access  Private
 */
const markAsRead = async (req, res) => {
<<<<<<< HEAD
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isRead: true },
      { new: true }
    );
=======
<<<<<<< Updated upstream
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id },
            { isRead: true },
            { new: true }
        );
=======
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isRead: true },
      { new: true }
    );
>>>>>>> Stashed changes
>>>>>>> 5a2097e (feat(notification): Tích hợp thông báo và gửi email)

    if (!notification) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    }

    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/**
 * @desc    Đánh dấu tất cả notification là đã đọc
 * @route   PATCH /api/notifications/read-all
 * @access  Private
 */
const markAllAsRead = async (req, res) => {
<<<<<<< HEAD
  try {
    await Notification.updateMany(
      { userId: req.user.id, isRead: false },
      { isRead: true }
    );
=======
<<<<<<< Updated upstream
    try {
        await Notification.updateMany(
            { userId: req.user.id, isRead: false },
            { isRead: true }
        );
=======
  try {
    await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { isRead: true },
      { new: true }
    );
>>>>>>> Stashed changes
>>>>>>> 5a2097e (feat(notification): Tích hợp thông báo và gửi email)

    res
      .status(200)
      .json({ success: true, message: "All notifications marked as read" });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/**
 * @desc    Xóa một notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
const deleteNotification = async (req, res) => {
<<<<<<< HEAD
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });
=======
<<<<<<< Updated upstream
    try {
        const notification = await Notification.findOneAndDelete({
            _id: req.params.id,
            userId: req.user.id,
        });
=======
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params._id,
      userId: req.user._id,
    });
>>>>>>> Stashed changes
>>>>>>> 5a2097e (feat(notification): Tích hợp thông báo và gửi email)

    if (!notification) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Notification deleted successfully" });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

module.exports = {
<<<<<<< HEAD
=======
<<<<<<< Updated upstream
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
};
=======
>>>>>>> 5a2097e (feat(notification): Tích hợp thông báo và gửi email)
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
<<<<<<< HEAD
};
=======
  getUnreadCount,
};
>>>>>>> Stashed changes
>>>>>>> 5a2097e (feat(notification): Tích hợp thông báo và gửi email)
