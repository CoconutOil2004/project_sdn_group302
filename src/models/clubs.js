// models/Club.js
const mongoose = require("mongoose");

const ClubSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    category: {
      type: String,
      enum: ["Technology", "Sports", "Arts", "Volunteer", "Other"],
      default: "Other",
    },
    logo: { type: String, required: true },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "clubs" }
);

module.exports = mongoose.model("Club", ClubSchema);
