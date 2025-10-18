const express = require("express");
const eventRouter = require("./events");
const clubRouter = require("./clubs");

const router = express.Router();
router.use("/clubs", clubRouter);
router.use("/events", eventRouter);
module.exports = router;
