const express = require("express");
const {
  getAllClubs,
  getClubDetailbyId,
  createClub,
} = require("../controllers/controllerClubs");

const clubRouter = express.Router();
clubRouter.get("/", getAllClubs);
clubRouter.get("/:id", getClubDetailbyId);
clubRouter.post("/", createClub)
module.exports = clubRouter;
