src/routes/index.js

const express = require("express");
const eventRouter = require("./events");
const clubRouter = require("./clubs");

const notificationRoutes = require("./notifications");
const userRouter = require("./users");
const requestRouter = require("./requests");

const router = express.Router();
router.use("/clubs", clubRouter);
router.use("/events", eventRouter);

router.use("/notifications", notificationRoutes);
router.use("/requests", requestRouter);
router.use("/users", userRouter);

module.exports = router;