const lessonService = require("../services/lesson.service");
// LESSON CRUD
const createLesson = async (req, res) => {
  try {
    const { batch, title, description, videoUrl, duration, order } = req.body;

    if (!batch || !title) {
      return res.status(400).json({
        success: false,
        message: "Batch and title are required",
      });
    }

    const lesson = await lessonService.createLesson({
      batch,
      title: title.trim(),
      description: description?.trim() || "",
      videoUrl: videoUrl?.trim() || "",
      duration: duration?.trim() || "",
      order: order ?? 0,
    }, req.user);

    return res.status(201).json({
      success: true,
      message: "Lesson created successfully",
      data: lesson,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const getLessonsByBatch = async (req, res) => {
  try {
    const lessons = await lessonService.getLessonsByBatch(req.params.batchId, req.user);

    return res.status(200).json({
      success: true,
      count: lessons.length,
      data: lessons,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

const getLessonById = async (req, res) => {
  try {
    const lesson = await lessonService.getLessonById(req.params.id, req.user);

    return res.status(200).json({
      success: true,
      data: lesson,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

const updateLesson = async (req, res) => {
  try {
    const lesson = await lessonService.updateLesson(req.params.id, req.body, req.user);

    return res.status(200).json({
      success: true,
      message: "Lesson updated successfully",
      data: lesson,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteLesson = async (req, res) => {
  try {
    const lesson = await lessonService.deleteLesson(req.params.id, req.user);

    return res.status(200).json({
      success: true,
      message: "Lesson deleted successfully",
      data: {
        id: lesson._id,
        title: lesson.title,
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const getBatchProgress = async (req, res) => {
  try {
    const progress = await lessonService.getBatchProgress(req.params.batchId, req.user.userId);
    return res.status(200).json({ success: true, data: progress });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const toggleLessonProgress = async (req, res) => {
  try {
    const progress = await lessonService.toggleLessonProgress(req.params.id, req.user.userId);
    return res.status(200).json({ success: true, message: progress.completed ? "Lesson marked complete" : "Lesson marked incomplete", data: progress });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
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
