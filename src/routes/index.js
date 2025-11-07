const express = require("express");
const eventRouter = require("./events");
const clubRouter = require("./clubs");
const messagesRouter = require("./messages");
const notificationRoutes = require("./notifications.routes");
const userRouter = require("./users");
const requestRouter = require("./requests");

const router = express.Router();
router.use("/clubs", clubRouter);
router.use("/events", eventRouter);

router.use("/messages", messagesRouter);
router.use("/notifications", notificationRoutes);
router.use("/requests", requestRouter);
router.use("/users", userRouter);

module.exports = router;