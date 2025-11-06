const express = require("express");
const {
  getAllClubs,
  getClubDetailbyId,
  createClub,
  approveClub,
  addMemberToClub,
} = require("../controllers/controllerClubs");

const clubRouter = express.Router();
clubRouter.get("/", getAllClubs);
clubRouter.get("/:id", getClubDetailbyId);
clubRouter.post("/", createClub);
clubRouter.post("/", approveClub);
clubRouter.post("/add-member", addMemberToClub);
module.exports = clubRouter;
