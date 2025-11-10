const express = require("express");
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
<<<<<<< HEAD
} = require("../controllers/notifications.controller");
=======
<<<<<<< Updated upstream
} = require("../controllers/notifications.js");
=======
  getUnreadCount,
} = require("../controllers/notifications.controller");
>>>>>>> Stashed changes
>>>>>>> 5a2097e (feat(notification): Tích hợp thông báo và gửi email)

const { protect } = require("../middleware/authMiddleware"); 
router.get("/unread-count", protect, getUnreadCount);
router.get("/", protect, getNotifications);
router.patch("/read-all", protect, markAllAsRead);
router.patch("/:id/read", protect, markAsRead);
router.delete("/:id", protect, deleteNotification);

module.exports = router;