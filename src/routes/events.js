const express = require("express");
const router = express.Router();
const eventController = require("../controllers/controllerEvent");

router.get("/", eventController.getAllEvents);
router.get("/:id", eventController.getEventById);
router.post("/create", eventController.createEvent);
router.post("/participants/:id", eventController.addParticipant);
router.delete("/:id", eventController.deleteEvent);

module.exports = router;
