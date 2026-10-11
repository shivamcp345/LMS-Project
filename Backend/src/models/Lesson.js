const mongoose = require("mongoose");

const lessonSchema = new mongoose.Schema(
  {
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: [true, "Batch is required"],
    },

    title: {
      type: String,
      required: [true, "Lesson title is required"],
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    videoUrl: {
      type: String,
      trim: true,
      default: "",
    },

    materialType: {
      type: String,
      enum: ["recording", "document", "link", "note", "assignment"],
      default: "recording",
    },

    duration: {
      type: String,
      trim: true,
      default: "",
    },

    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Lesson", lessonSchema);
