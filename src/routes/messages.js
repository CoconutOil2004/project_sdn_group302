const express = require("express");
const {
  createOrGetThread,
  listThreads,
  getThreadMessages,
  sendMessage,
  markRead,
  pin,
  unpin,
  listAvailableUsers,
} = require("../controllers/controllerMessages");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.param("threadId", (req, res, next, threadId) => {
  try {
    req.params.threadKey =
      typeof threadId === "string" ? decodeURIComponent(threadId) : threadId;
  } catch (error) {
    req.params.threadKey = threadId;
  }
  next();
});

router
  .route("/threads")
  .post(protect, createOrGetThread)
  .get(protect, listThreads);

router.get("/users", protect, listAvailableUsers);

router
  .route("/threads/:threadId/messages")
  .get(protect, getThreadMessages)
  .post(protect, sendMessage);

router.put("/threads/:threadId/read", protect, markRead);
router.put("/threads/:threadId/pin", protect, pin);
router.put("/threads/:threadId/unpin", protect, unpin);

module.exports = router;

