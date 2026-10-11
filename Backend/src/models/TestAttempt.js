const mongoose = require("mongoose");

const testAttemptSchema = new mongoose.Schema({
  test: { type: mongoose.Schema.Types.ObjectId, ref: "BatchTest", required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  answers: { type: [Number], default: [] },
  status: { type: String, enum: ["in-progress", "submitted", "eliminated", "time-expired"], default: "submitted" },
  startedAt: { type: Date, default: null },
  endedAt: { type: Date, default: null },
  warningCount: { type: Number, default: 0 },
  score: { type: Number, default: null },
  total: { type: Number, required: true },
  correctCount: { type: Number, default: 0 },
  wrongCount: { type: Number, default: 0 },
  unansweredCount: { type: Number, default: 0 },
  percentage: { type: Number, default: null },
  evaluation: { type: String, enum: ["Excellent", "Good", "Average", "Poor"], default: null },
  feedback: { type: String, default: "" },
  isGraded: { type: Boolean, default: true },
  responseKey: { type: String, default: "" },
  responseName: { type: String, default: "" },
}, { timestamps: true });

testAttemptSchema.index({ test: 1, student: 1 }, { unique: true });
module.exports = mongoose.model("TestAttempt", testAttemptSchema);
