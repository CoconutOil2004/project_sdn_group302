const express = require("express");
const {
  getAllClubs,
  getClubDetailbyId,
  createClub,
  approveClub,
  addMemberToClub,
  getMyClubs,
} = require("../controllers/controllerClubs");
const { protect } = require("../middleware/authMiddleware");

const clubRouter = express.Router();
clubRouter.get("/", getAllClubs);
clubRouter.get("/my-clubs", protect, getMyClubs); // Route này phải đặt trước /:id
clubRouter.get("/:id", getClubDetailbyId);
clubRouter.post("/", createClub);
clubRouter.put("/approve/:id", approveClub);
clubRouter.post("/add-member", addMemberToClub);
module.exports = clubRouter;
