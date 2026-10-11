const mongoose = require("mongoose");

const scheduleSlotSchema = new mongoose.Schema(
  {
    dayOfWeek: {
      type: String,
      enum: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      required: [true, "Day of week is required"],
    },

    startTime: {
      type: String, // "HH:mm" in 24h format
      required: [true, "Start time is required"],
    },

    endTime: {
      type: String, // "HH:mm" in 24h format
      required: [true, "End time is required"],
    },

    meetLink: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: true },
);

const batchSchema = new mongoose.Schema(
  {
    batchName: {
      type: String,
      required: [true, "Batch name is required"],
      trim: true,
      maxlength: [100, "Batch name cannot exceed 100 characters"],
    },

    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      default: null,
    },

    trainer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    status: {
      type: String,
      enum: ["Active", "Inactive", "Completed"],
      default: "Active",
    },

    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },

    endDate: {
      type: Date,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    schedule: {
      type: [scheduleSlotSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Batch", batchSchema);
