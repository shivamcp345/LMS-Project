const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Course title is required"],
      trim: true,
      maxlength: [100, "Course title cannot exceed 100 characters"],
    },

    description: {
      type: String,
      required: [true, "Course description is required"],
      trim: true,
    },

    category: {
      type: String,
      default: "General",
      trim: true,
    },

    instructor: {
      type: String,
      default: "Learnly Team",
      trim: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    level: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
      default: "Beginner",
    },

    thumbnail: {
      type: String,
      default: null,
    },

    duration: {
      type: String,
      default: "",
    },

    lessonsCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    rating: {
      type: Number,
      default: 4.5,
      min: 0,
      max: 5,
    },

    curriculum: {
      type: [
        {
          title: { type: String, trim: true },
          duration: { type: String, trim: true, default: "10 min" },
        },
      ],
      default: [],
    },

    isPublished: {
      type: Boolean,
      default: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Course", courseSchema);
