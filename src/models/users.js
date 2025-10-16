// models/User.js
const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "manager", "student"],
      default: "student",
    },
    joinedClubs: [
      {
        clubId: { type: mongoose.Schema.Types.ObjectId, ref: "Club" },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    avatar: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "users" }
);

module.exports = mongoose.model("User", UserSchema);
