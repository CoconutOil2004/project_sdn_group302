const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["DIRECT", "USER_CLUB", "CLUB_BROADCAST", "EVENT"],
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    participants: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        clubId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Club",
        },
        eventId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Event",
        },
      },
    ],
    content: { type: String, required: true, trim: true },
    attachments: [
      {
        url: { type: String, required: true },
        name: { type: String, default: "" },
        size: { type: Number },
      },
    ],
    meta: {
      isPinned: { type: Boolean, default: false },
      isSystem: { type: Boolean, default: false },
    },
    readBy: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        readAt: { type: Date, default: Date.now },
      },
    ],
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "messages" }
);

MessageSchema.index({
  type: 1,
  "participants.userId": 1,
  "participants.clubId": 1,
  "participants.eventId": 1,
});
MessageSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Message", MessageSchema);