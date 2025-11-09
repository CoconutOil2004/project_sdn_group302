const mongoose = require("mongoose");
const EventSchema = new mongoose.Schema(
  {
    clubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Club",
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String },
    date: { type: Date, required: true },
    location: { type: String },
    image: { type: String, required: true },
    participants: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "events" }
);

EventSchema.index({ clubId: 1, date: -1 });
EventSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Event", EventSchema);
