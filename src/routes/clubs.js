const express = require("express");
const {
  getAllClubs,
  getClubDetailbyId,
} = require("../controllers/controllerClubs");

const clubRouter = express.Router();
clubRouter.get("/", getAllClubs);
clubRouter.get("/:id", getClubDetailbyId);
module.exports = clubRouter;
