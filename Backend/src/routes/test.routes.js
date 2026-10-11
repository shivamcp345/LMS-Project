const express = require("express");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const BatchTest = require("../models/BatchTest");
const TestAttempt = require("../models/TestAttempt");
const Batch = require("../models/Batch");
const BatchStudent = require("../models/BatchStudent");
const upload = require("../config/multer");
const { authenticate, authorize } = require("../middleware/auth.middleware");

const router = express.Router();
const filesDirectory = path.join(__dirname, "../../private-uploads");
router.use(authenticate);

function evaluationFor(percentage) {
  if (percentage >= 90) return "Excellent";
  if (percentage >= 75) return "Good";
  if (percentage >= 50) return "Average";
  return "Poor";
}

function normalizeMcqAnswers(input, test) {
  if (!Array.isArray(input) || input.length !== test.questions.length) {
    throw new Error("Submit an answer for each question slot");
  }
  return input.map((answer, index) => {
    if (answer === null || answer === undefined) return null;
    if (!Number.isInteger(answer) || answer < 0 || answer >= test.questions[index].options.length) {
      throw new Error("One or more answers are invalid");
    }
    return answer;
  });
}

function finishMcqAttempt(attempt, test, answers, status) {
  const correctCount = answers.reduce(
    (sum, answer, index) => sum + Number(answer !== null && answer === test.questions[index].answerIndex),
    0,
  );
  const answeredCount = answers.filter((answer) => answer !== null).length;
  const percentage = Math.round((correctCount / test.questions.length) * 100);
  attempt.answers = answers;
  attempt.score = correctCount;
  attempt.total = test.questions.length;
  attempt.correctCount = correctCount;
  attempt.wrongCount = answeredCount - correctCount;
  attempt.unansweredCount = test.questions.length - answeredCount;
  attempt.percentage = percentage;
  attempt.evaluation = evaluationFor(percentage);
  attempt.isGraded = true;
  attempt.status = status;
  attempt.endedAt = new Date();
}

function attemptExpired(attempt, test) {
  return attempt.startedAt && Date.now() >= attempt.startedAt.getTime() + test.durationMinutes * 60_000;
}

async function canAccessBatch(user, batchId) {
  if (user.role === "admin") return true;
  if (user.role === "trainer") return Boolean(await Batch.exists({ _id: batchId, trainer: user.userId, isDeleted: { $ne: true } }));
  if (user.role === "user") return Boolean(await BatchStudent.exists({ batch: batchId, student: user.userId }));
  return false;
}

function sendPrivateFile(res, key) {
  const filePath = path.join(filesDirectory, path.basename(key || ""));
  if (!key || !fs.existsSync(filePath)) return res.status(404).json({ success: false, message: "File not found" });
  return res.sendFile(filePath);
}

router.get("/batch/:batchId", authorize("trainer", "user", "admin"), async (req, res) => {
  try {
    if (!await canAccessBatch(req.user, req.params.batchId)) return res.status(403).json({ success: false, message: "You cannot access this batch" });
    const tests = await BatchTest.find({ batch: req.params.batchId }).sort({ createdAt: -1 }).lean();
    let attempts = [];
    if (req.user.role === "user") attempts = await TestAttempt.find({ student: req.user.userId, test: { $in: tests.map((test) => test._id) } }).lean();
    const attemptByTest = new Map(attempts.map((attempt) => [String(attempt.test), attempt]));
    const data = tests.map((test) => ({
      ...test,
      questions: req.user.role === "trainer" || req.user.role === "admin" ? test.questions : test.questions.map(({ prompt, options }) => ({ prompt, options })),
      paperKey: undefined,
      attempt: attemptByTest.get(String(test._id)) || null,
    }));
    return res.json({ success: true, data });
  } catch (error) { return res.status(400).json({ success: false, message: error.message }); }
});

router.post("/batch/:batchId", authorize("trainer"), upload.governmentDocument.single("paper"), async (req, res) => {
  try {
    const batch = await Batch.findOne({ _id: req.params.batchId, trainer: req.user.userId, isDeleted: { $ne: true } });
    if (!batch) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(403).json({ success: false, message: "You are not assigned to this batch" });
    }
    const format = req.body.format || "mcq";
    const questions = typeof req.body.questions === "string" ? JSON.parse(req.body.questions || "[]") : req.body.questions || [];
    const durationMinutes = Number(req.body.durationMinutes ?? 60);
    if (req.file && req.file.mimetype !== "application/pdf") {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: "Upload a PDF file" });
    }
    if (!req.body.title?.trim()) return res.status(400).json({ success: false, message: "Test title is required" });
    if (format === "mcq" && (!Array.isArray(questions) || !questions.length || questions.some((question) => !question.prompt?.trim() || !Array.isArray(question.options) || question.options.length < 2 || !Number.isInteger(question.answerIndex) || question.answerIndex < 0 || question.answerIndex >= question.options.length))) return res.status(400).json({ success: false, message: "Add valid multiple choice questions and correct answers" });
    if (format === "pdf" && (!req.file || Number(req.body.totalMarks) < 1)) return res.status(400).json({ success: false, message: "Upload the question PDF and set total marks" });
    if (! ["mcq", "pdf"].includes(format)) return res.status(400).json({ success: false, message: "Choose MCQ or PDF format" });
    if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 720) return res.status(400).json({ success: false, message: "Test duration must be between 1 and 720 minutes" });
    const test = await BatchTest.create({
      batch: batch._id, trainer: req.user.userId, title: req.body.title, description: req.body.description,
      format, questions: format === "mcq" ? questions : [], totalMarks: format === "pdf" ? Number(req.body.totalMarks) : questions.length, durationMinutes,
      paperKey: req.file?.filename || "", paperName: req.file?.originalname || "",
    });
    return res.status(201).json({ success: true, data: { _id: test._id, title: test.title, format: test.format } });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(400).json({ success: false, message: error.message });
  }
});

router.get("/batch/:batchId/results", authorize("trainer", "admin"), async (req, res) => {
  try {
    if (!await canAccessBatch(req.user, req.params.batchId)) return res.status(403).json({ success: false, message: "You cannot access this batch" });
    const tests = await BatchTest.find({ batch: req.params.batchId }).select("_id title format totalMarks").lean();
    const attempts = await TestAttempt.find({ test: { $in: tests.map((test) => test._id) } }).populate("student", "name email mobile").populate("test", "title format totalMarks").sort({ updatedAt: -1 }).lean();
    return res.json({ success: true, data: { tests, attempts } });
  } catch (error) { return res.status(400).json({ success: false, message: error.message }); }
});

router.get("/student/me/results", authorize("user"), async (req, res) => {
  try {
    const attempts = await TestAttempt.find({ student: req.user.userId }).populate({ path: "test", select: "title format totalMarks batch", populate: { path: "batch", select: "batchName" } }).sort({ updatedAt: -1 }).lean();
    return res.json({ success: true, data: attempts.filter((attempt) => attempt.test) });
  } catch (error) { return res.status(400).json({ success: false, message: error.message }); }
});

router.get("/student/:studentId/results", authorize("user", "trainer", "admin"), async (req, res) => {
  try {
    const { studentId } = req.params;
    if (req.user.role === "user" && String(req.user.userId) !== String(studentId)) return res.status(403).json({ success: false, message: "You can only view your own results" });
    let attempts = await TestAttempt.find({ student: studentId }).populate({ path: "test", select: "title format totalMarks batch", populate: { path: "batch", select: "batchName trainer" } }).sort({ updatedAt: -1 }).lean();
    if (req.user.role === "trainer") attempts = attempts.filter((attempt) => String(attempt.test?.batch?.trainer) === String(req.user.userId));
    return res.json({ success: true, data: attempts.filter((attempt) => attempt.test) });
  } catch (error) { return res.status(400).json({ success: false, message: error.message }); }
});

router.post("/:testId/start", authorize("user"), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.testId)) return res.status(404).json({ success: false, message: "Test not found" });
    const test = await BatchTest.findById(req.params.testId);
    if (!test || !await BatchStudent.exists({ batch: test.batch, student: req.user.userId })) return res.status(403).json({ success: false, message: "Test is not available to you" });
    if (test.format !== "mcq") return res.status(400).json({ success: false, message: "Timed attempts are available for MCQ tests" });
    const existing = await TestAttempt.findOne({ test: test._id, student: req.user.userId });
    if (existing) {
      if (existing.status === "in-progress") return res.json({ success: true, data: existing });
      return res.status(409).json({ success: false, message: "You have already attempted this test" });
    }
    const attempt = await TestAttempt.create({
      test: test._id,
      student: req.user.userId,
      answers: Array(test.questions.length).fill(null),
      total: test.questions.length,
      score: null,
      isGraded: false,
      status: "in-progress",
      startedAt: new Date(),
    });
    return res.status(201).json({ success: true, data: attempt });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: "This test attempt already exists" });
    return res.status(400).json({ success: false, message: error.message });
  }
});

router.put("/:testId/attempts/:attemptId/progress", authorize("user"), async (req, res) => {
  try {
    const test = await BatchTest.findById(req.params.testId);
    if (!test || test.format !== "mcq" || !await BatchStudent.exists({ batch: test.batch, student: req.user.userId })) return res.status(403).json({ success: false, message: "Test is not available to you" });
    const attempt = await TestAttempt.findOne({ _id: req.params.attemptId, test: test._id, student: req.user.userId });
    if (!attempt || attempt.status !== "in-progress") return res.status(409).json({ success: false, message: "This test attempt is no longer active" });
    const answers = normalizeMcqAnswers(req.body.answers, test);
    attempt.answers = answers;
    if (req.body.warning === true) attempt.warningCount += 1;
    if (attemptExpired(attempt, test)) {
      finishMcqAttempt(attempt, test, answers, "time-expired");
    } else if (attempt.warningCount >= 3) {
      finishMcqAttempt(attempt, test, answers, "eliminated");
    }
    await attempt.save();
    return res.json({ success: true, data: attempt });
  } catch (error) { return res.status(400).json({ success: false, message: error.message }); }
});

router.post("/:testId/attempt", authorize("user"), upload.governmentDocument.single("answer"), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.testId)) return res.status(404).json({ success: false, message: "Test not found" });
    const test = await BatchTest.findById(req.params.testId);
    if (!test || !await BatchStudent.exists({ batch: test.batch, student: req.user.userId })) return res.status(403).json({ success: false, message: "Test is not available to you" });
    if (req.file && req.file.mimetype !== "application/pdf") {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: "Upload a PDF answer file" });
    }
    const existing = await TestAttempt.findOne({ test: test._id, student: req.user.userId });
    if (existing && existing.status !== "in-progress") {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(409).json({ success: false, message: "You have already attempted this test" });
    }
    if (test.format === "mcq") {
      const answers = typeof req.body.answers === "string" ? JSON.parse(req.body.answers) : req.body.answers;
      const normalizedAnswers = normalizeMcqAnswers(answers, test);
      const attempt = existing || new TestAttempt({ test: test._id, student: req.user.userId, total: test.questions.length });
      const status = attemptExpired(attempt, test) ? "time-expired" : "submitted";
      finishMcqAttempt(attempt, test, normalizedAnswers, status);
      await attempt.save();
      return res.status(201).json({ success: true, data: attempt });
    }
    if (test.format === "pdf" && !req.file) return res.status(400).json({ success: false, message: "Upload your answer as a PDF" });
    const attempt = await TestAttempt.create({ test: test._id, student: req.user.userId, score: null, total: test.totalMarks, percentage: null, evaluation: null, isGraded: false, responseKey: req.file.filename, responseName: req.file.originalname });
    return res.status(201).json({ success: true, data: attempt });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(400).json({ success: false, message: error.message });
  }
});

router.put("/:testId/attempts/:attemptId/grade", authorize("trainer", "admin"), async (req, res) => {
  try {
    const test = await BatchTest.findById(req.params.testId);
    if (!test || !await canAccessBatch(req.user, test.batch)) return res.status(403).json({ success: false, message: "You cannot grade this test" });
    const attempt = await TestAttempt.findOne({ _id: req.params.attemptId, test: test._id });
    if (!attempt) return res.status(404).json({ success: false, message: "Test submission not found" });
    const score = Number(req.body.score);
    if (!Number.isFinite(score) || score < 0 || score > test.totalMarks) return res.status(400).json({ success: false, message: "Enter a mark between 0 and the total marks" });
    const percentage = Math.round((score / test.totalMarks) * 100);
    attempt.score = score;
    attempt.total = test.totalMarks;
    attempt.percentage = percentage;
    attempt.evaluation = evaluationFor(percentage);
    attempt.feedback = String(req.body.feedback || "").trim();
    attempt.isGraded = true;
    await attempt.save();
    return res.json({ success: true, data: attempt });
  } catch (error) { return res.status(400).json({ success: false, message: error.message }); }
});

router.get("/:testId/paper", authorize("user", "trainer", "admin"), async (req, res) => {
  try {
    const test = await BatchTest.findById(req.params.testId).select("batch paperKey");
    if (!test || !await canAccessBatch(req.user, test.batch)) return res.status(403).json({ success: false, message: "You cannot view this test" });
    return sendPrivateFile(res, test.paperKey);
  } catch (error) { return res.status(400).json({ success: false, message: error.message }); }
});

router.get("/attempts/:attemptId/answer", authorize("user", "trainer", "admin"), async (req, res) => {
  try {
    const attempt = await TestAttempt.findById(req.params.attemptId).populate("test", "batch");
    if (!attempt || !await canAccessBatch(req.user, attempt.test.batch)) return res.status(403).json({ success: false, message: "You cannot view this answer" });
    if (req.user.role === "user" && String(attempt.student) !== String(req.user.userId)) return res.status(403).json({ success: false, message: "You cannot view another student's answer" });
    return sendPrivateFile(res, attempt.responseKey);
  } catch (error) { return res.status(400).json({ success: false, message: error.message }); }
});

module.exports = router;
