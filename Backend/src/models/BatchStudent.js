const mongoose = require("mongoose");

const batchStudentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// A student can only be mapped to the same batch once
batchStudentSchema.index({ student: 1, batch: 1 }, { unique: true });

module.exports = mongoose.model("BatchStudent", batchStudentSchema);
