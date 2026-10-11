const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  prompt: { type: String, required: true, trim: true },
  options: { type: [String], validate: (options) => options.length >= 2 },
  answerIndex: { type: Number, required: true },
});

const batchTestSchema = new mongoose.Schema({
  batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", required: true, index: true },
  trainer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, default: "" },
  format: { type: String, enum: ["mcq", "pdf"], default: "mcq" },
  questions: { type: [questionSchema], default: [] },
  totalMarks: { type: Number, default: 0 },
  durationMinutes: { type: Number, min: 1, max: 720, default: 60 },
  paperKey: { type: String, default: "" },
  paperName: { type: String, default: "" },
}, { timestamps: true });

batchTestSchema.pre("validate", function validateTest() {
  if (this.format === "mcq" && !this.questions.length) this.invalidate("questions", "Add at least one question");
  if (this.format === "pdf" && (!this.paperKey || this.totalMarks < 1)) this.invalidate("paperKey", "Upload a PDF and set total marks");
});

module.exports = mongoose.model("BatchTest", batchTestSchema);
