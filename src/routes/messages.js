const express = require("express");
const {
  createOrGetThread,
  listThreads,
  getThreadMessages,
  sendMessage,
  markRead,
  pin,
  unpin,
} = require("../controllers/controllerMessages");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.param("threadId", (req, res, next, threadId) => {
  req.params.threadKey = threadId;
  next();
});

router
  .route("/threads")
  .post(protect, createOrGetThread)
  .get(protect, listThreads);

router
  .route("/threads/:threadId/messages")
  .get(protect, getThreadMessages)
  .post(protect, sendMessage);

router.put("/threads/:threadId/read", protect, markRead);
router.put("/threads/:threadId/pin", protect, pin);
router.put("/threads/:threadId/unpin", protect, unpin);

module.exports = router;

