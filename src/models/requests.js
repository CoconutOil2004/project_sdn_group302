// models/Request.js
const mongoose = require("mongoose");

const RequestSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    clubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Club",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    message: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "requests" }
);

module.exports = mongoose.model("Request", RequestSchema);
