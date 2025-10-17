const express = require("express");
const eventRouter = require("./events");
const clubRouter = require("./clubs");
const notificationRoutes = require("./notifications");

const router = express.Router();
router.use("/clubs", clubRouter);
router.use("/events", eventRouter);
router.use("/notifications", notificationRoutes);
module.exports = router;
