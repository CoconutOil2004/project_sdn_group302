const express = require("express");
const eventRouter = require("./events");
const clubRouter = require("./clubs");
const requestRouter = require("./requests");

const router = express.Router();
router.use("/clubs", clubRouter);
router.use("/events", eventRouter);
router.use("/requests", requestRouter);
module.exports = router;
