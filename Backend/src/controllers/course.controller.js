const courseService = require("../services/course.service");

const getAllCourses = async (req, res) => {
  try {
    const courses = await courseService.getAllCourses();

    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses,
    });
  } catch (error) {
    console.error("GET COURSES ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getPublishedCourses = async (req, res) => {
  try {
    const courses = await courseService.getPublishedCourses();

    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses,
    });
  } catch (error) {
    console.error("GET PUBLISHED COURSES ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getCourseById = async (req, res) => {
  try {
    const course = await courseService.getCourseById(req.params.id);

    res.status(200).json({
      success: true,
      data: course,
    });
  } catch (error) {
    console.error("GET COURSE ERROR:", error);

    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

const createCourse = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      instructor,
      price,
      level,
      thumbnail,
      duration,
      lessonsCount,
      isPublished,
      isActive,
      rating,
      curriculum,
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: "Title and description are required",
      });
    }

    const course = await courseService.createCourse({
      title: title.trim(),
      description: description.trim(),
      category: category?.trim(),
      instructor: instructor?.trim(),
      price,
      level,
      thumbnail,
      duration,
      lessonsCount,
      isPublished,
      isActive,
      rating,
      curriculum,
    });

    res.status(201).json({
      success: true,
      message: "Course created successfully",
      data: course,
    });
  } catch (error) {
    console.error("CREATE COURSE ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateCourse = async (req, res) => {
  try {
    const course = await courseService.updateCourse(
      req.params.id,
      req.body,
    );

    res.status(200).json({
      success: true,
      message: "Course updated successfully",
      data: course,
    });
  } catch (error) {
    console.error("UPDATE COURSE ERROR:", error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteCourse = async (req, res) => {
  try {
    const course = await courseService.deleteCourse(req.params.id);

    res.status(200).json({
      success: true,
      message: "Course deleted successfully",
      data: {
        id: course._id,
        title: course.title,
      },
    });
  } catch (error) {
    console.error("DELETE COURSE ERROR:", error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const togglePublishCourse = async (req, res) => {
  try {
    const course = await courseService.togglePublishCourse(
      req.params.id,
    );

    res.status(200).json({
      success: true,
      message: course.isPublished
        ? "Course published successfully"
        : "Course moved to draft",
      data: course,
    });
  } catch (error) {
    console.error("TOGGLE PUBLISH ERROR:", error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const toggleCourseStatus = async (req, res) => {
  try {
    const course = await courseService.toggleCourseStatus(req.params.id);

    return res.status(200).json({
      success: true,
      message: course.isActive
        ? "Course activated successfully"
        : "Course deactivated successfully",
      data: course,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getAllCourses,
  getPublishedCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  togglePublishCourse,
  toggleCourseStatus,
};