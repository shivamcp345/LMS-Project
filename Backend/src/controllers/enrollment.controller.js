const enrollmentService = require("../services/enrollment.service");

const enrollInCourse = async (req, res) => {
  try {
    const { courseId } = req.body;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "Course id is required",
      });
    }

    const enrollment = await enrollmentService.enrollInCourse(
      req.user.userId,
      courseId,
    );

    return res.status(201).json({
      success: true,
      message: "Enrolled successfully",
      data: enrollment,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const unenrollFromCourse = async (req, res) => {
  try {
    await enrollmentService.unenrollFromCourse(
      req.user.userId,
      req.params.courseId,
    );

    return res.status(200).json({
      success: true,
      message: "Unenrolled successfully",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const getMyEnrollments = async (req, res) => {
  try {
    const enrollments = await enrollmentService.getMyEnrollments(
      req.user.userId,
    );

    return res.status(200).json({
      success: true,
      count: enrollments.length,
      data: enrollments,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getEnrollmentForCourse = async (req, res) => {
  try {
    const enrollment = await enrollmentService.getEnrollmentForCourse(
      req.user.userId,
      req.params.courseId,
    );

    return res.status(200).json({
      success: true,
      data: enrollment,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateLessonProgress = async (req, res) => {
  try {
    const { lessonIndex } = req.body;

    if (!Number.isInteger(Number(lessonIndex)) || String(lessonIndex).trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Lesson index is required",
      });
    }

    const enrollment = await enrollmentService.updateLessonProgress(
      req.user.userId,
      req.params.courseId,
      Number(lessonIndex),
    );

    return res.status(200).json({
      success: true,
      message: "Progress updated",
      data: enrollment,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const getStudentStats = async (req, res) => {
  try {
    const stats = await enrollmentService.getStudentStats(req.user.userId);

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getAdminStats = async (req, res) => {
  try {
    const stats = await enrollmentService.getAdminStats({ period: req.query.period, year: req.query.year });

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  enrollInCourse,
  unenrollFromCourse,
  getMyEnrollments,
  getEnrollmentForCourse,
  updateLessonProgress,
  getStudentStats,
  getAdminStats,
};
