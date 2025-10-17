const express = require("express");
const eventRouter = require("./events");
const clubRouter = require("./clubs");
const userRouter = require("./users");

const router = express.Router();
router.use("/clubs", clubRouter);
router.use("/events", eventRouter);
router.use("/users", userRouter);

module.exports = router;
