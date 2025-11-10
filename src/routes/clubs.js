const express = require("express");
const {
  getAllClubs,
  getClubDetailbyId,
  createClub,
  approveClub,
  rejectClub,
  addMemberToClub,
  getMyClubs,
  getClubsForAdmin,
  updateClub,
  deleteClub,
} = require("../controllers/controllerClubs");
const { protect, isAdmin } = require("../middleware/authMiddleware");

const clubRouter = express.Router();
clubRouter.get("/", getAllClubs);
clubRouter.get("/my-clubs", protect, getMyClubs); // Route này phải đặt trước /:id
// Admin list with optional status filter
clubRouter.get("/admin", protect, isAdmin, getClubsForAdmin);
clubRouter.get("/:id", getClubDetailbyId);
clubRouter.post("/", protect, createClub);
// Align path with frontend service: /clubs/:id/approve
clubRouter.put("/:id/approve", protect, isAdmin, approveClub);
clubRouter.put("/:id/reject", protect, isAdmin, rejectClub);
// Update/Delete club
clubRouter.put("/:id", protect, updateClub);
clubRouter.delete("/:id", protect, deleteClub);
clubRouter.post("/add-member", addMemberToClub);
module.exports = clubRouter;
