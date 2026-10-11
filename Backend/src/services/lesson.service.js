const Lesson = require("../models/Lesson");
const Batch = require("../models/Batch");
const BatchStudent = require("../models/BatchStudent");
const Enrollment = require("../models/Enrollment");

async function getAuthorizedBatch(batchId, actor) {
  const batch = await Batch.findOne({
    _id: batchId,
    isDeleted: { $ne: true },
  });

  if (!batch) throw new Error("Batch not found");

  if (actor?.role === "admin") return batch;

  if (actor?.role === "trainer") {
    if (batch.trainer?.toString() !== actor.userId.toString()) {
      throw new Error("You are not assigned to this batch");
    }
    return batch;
  }

  if (actor?.role === "user") {
    const member = await BatchStudent.findOne({
      batch: batchId,
      student: actor.userId,
    }).select("_id");
    if (!member) throw new Error("You are not enrolled in this batch");
    return batch;
  }

  throw new Error("You are not allowed to access this batch");
}

async function getAuthorizedLesson(lessonId, actor) {
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) throw new Error("Lesson not found");
  await getAuthorizedBatch(lesson.batch, actor);
  return lesson;
}

const createLesson = async (lessonData, actor) => {
  await getAuthorizedBatch(lessonData.batch, actor);

  return Lesson.create({
    ...lessonData,
    title: String(lessonData.title || "").trim(),
    description: String(lessonData.description || "").trim(),
    videoUrl: String(lessonData.videoUrl || "").trim(),
    materialType: ["recording", "document", "link", "note", "assignment"].includes(lessonData.materialType) ? lessonData.materialType : "recording",
    duration: String(lessonData.duration || "").trim(),
    order: Number(lessonData.order) || 0,
  });
};

const getLessonsByBatch = async (batchId, actor) => {
  await getAuthorizedBatch(batchId, actor);
  return Lesson.find({ batch: batchId }).sort({ order: 1, createdAt: 1 });
};

const getLessonById = async (lessonId, actor) => {
  const lesson = await getAuthorizedLesson(lessonId, actor);
  await lesson.populate("batch", "batchName course trainer");
  return lesson;
};

const updateLesson = async (lessonId, lessonData, actor) => {
  const lesson = await getAuthorizedLesson(lessonId, actor);

  if (lessonData.batch && lessonData.batch.toString() !== lesson.batch.toString()) {
    await getAuthorizedBatch(lessonData.batch, actor);
  }

  Object.assign(lesson, {
    ...lessonData,
    title: lessonData.title !== undefined ? String(lessonData.title).trim() : lesson.title,
    description: lessonData.description !== undefined ? String(lessonData.description).trim() : lesson.description,
    videoUrl: lessonData.videoUrl !== undefined ? String(lessonData.videoUrl).trim() : lesson.videoUrl,
    materialType: lessonData.materialType !== undefined && ["recording", "document", "link", "note", "assignment"].includes(lessonData.materialType) ? lessonData.materialType : lesson.materialType,
    duration: lessonData.duration !== undefined ? String(lessonData.duration).trim() : lesson.duration,
    order: lessonData.order !== undefined ? Number(lessonData.order) || 0 : lesson.order,
  });

  await lesson.save();
  return lesson;
};

const deleteLesson = async (lessonId, actor) => {
  const lesson = await getAuthorizedLesson(lessonId, actor);
  await Lesson.findByIdAndDelete(lessonId);
  return lesson;
};

const getBatchProgress = async (batchId, studentId) => {
  await getAuthorizedBatch(batchId, { userId: studentId, role: "user" });
  const batch = await Batch.findById(batchId).select("course");
  const enrollment = await Enrollment.findOne({ student: studentId, course: batch.course }).select("completedBatchLessons");
  return { completedLessonIds: (enrollment?.completedBatchLessons || []).map((id) => id.toString()) };
};

const toggleLessonProgress = async (lessonId, studentId) => {
  const lesson = await getAuthorizedLesson(lessonId, { userId: studentId, role: "user" });
  const batch = await Batch.findById(lesson.batch).select("course");
  const enrollment = await Enrollment.findOne({ student: studentId, course: batch.course });
  if (!enrollment) throw new Error("You are not enrolled in this batch's course");

  const lessonIdString = lesson._id.toString();
  const completed = (enrollment.completedBatchLessons || []).some((id) => id.toString() === lessonIdString);
  if (completed) {
    enrollment.completedBatchLessons = enrollment.completedBatchLessons.filter((id) => id.toString() !== lessonIdString);
  } else {
    enrollment.completedBatchLessons.push(lesson._id);
  }
  enrollment.lastAccessedAt = new Date();
  await enrollment.save();

  return { completed: !completed, completedLessonIds: enrollment.completedBatchLessons.map((id) => id.toString()) };
};

module.exports = {
  createLesson,
  getLessonsByBatch,
  getLessonById,
  updateLesson,
  deleteLesson,
  getBatchProgress,
  toggleLessonProgress,
};
