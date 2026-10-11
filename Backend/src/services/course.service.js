const Course = require("../models/Course");

const getAllCourses = async () => {
  return await Course.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 });
};

const getPublishedCourses = async () => {
  return await Course.find({
    isPublished: true,
    isActive: true,
    isDeleted: { $ne: true },
  }).sort({ createdAt: -1 });
};

const getCourseById = async (courseId) => {
  const course = await Course.findOne({
    _id: courseId,
    isDeleted: { $ne: true },
  });

  if (!course) {
    throw new Error("Course not found");
  }

  return course;
};

const createCourse = async (courseData) => {
  const curriculum = Array.isArray(courseData.curriculum)
    ? courseData.curriculum.filter((lesson) => lesson.title?.trim())
    : [];

  return await Course.create({
    ...courseData,
    price: Number(courseData.price) || 0,
    lessonsCount:
      Number(courseData.lessonsCount) || curriculum.length || 0,
    curriculum,
  });
};

const updateCourse = async (courseId, courseData) => {
  const course = await Course.findOne({
    _id: courseId,
    isDeleted: { $ne: true },
  });

  if (!course) {
    throw new Error("Course not found");
  }

  const curriculum = Array.isArray(courseData.curriculum)
    ? courseData.curriculum.filter((lesson) => lesson.title?.trim())
    : undefined;

  Object.assign(course, {
    ...courseData,

    price:
      courseData.price !== undefined
        ? Number(courseData.price) || 0
        : course.price,

    lessonsCount:
      courseData.lessonsCount !== undefined
        ? Number(courseData.lessonsCount) || 0
        : curriculum
          ? curriculum.length
          : course.lessonsCount,

    curriculum: curriculum !== undefined ? curriculum : course.curriculum,
  });

  await course.save();

  return course;
};
const deleteCourse = async (courseId) => {
  const course = await Course.findOne({
    _id: courseId,
    isDeleted: { $ne: true },
  });

  if (!course) {
    throw new Error("Course not found");
  }

  course.isDeleted = true;
  course.isActive = false;
  await course.save();

  return course;
};
const togglePublishCourse = async (courseId) => {
  const course = await Course.findOne({
    _id: courseId,
    isDeleted: { $ne: true },
  });

  if (!course) {
    throw new Error("Course not found");
  }

  course.isPublished = !course.isPublished;

  await course.save();

  return course;
};

const toggleCourseStatus = async (courseId) => {
  const course = await Course.findOne({
    _id: courseId,
    isDeleted: { $ne: true },
  });

  if (!course) {
    throw new Error("Course not found");
  }

  course.isActive = !course.isActive;
  await course.save();
  return course;
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
