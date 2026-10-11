const express = require("express");

const {
  getAllCourses,
  getPublishedCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  togglePublishCourse,
  toggleCourseStatus,
} = require("../controllers/course.controller");

const {
  authenticate,
  authorize,
} = require("../middleware/auth.middleware");

const router = express.Router();

/*
  USER
*/

// Published courses only
router.get("/published", authenticate, getPublishedCourses);

// Single course
router.get("/:id", authenticate, getCourseById);


/*
  ADMIN
*/

// All courses
router.get(
  "/",
  authenticate,
  authorize("admin"),
  getAllCourses,
);

// Create
router.post(
  "/",
  authenticate,
  authorize("admin"),
  createCourse,
);

// Update
router.put(
  "/:id",
  authenticate,
  authorize("admin"),
  updateCourse,
);

// Delete
router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  deleteCourse
);

// Publish / Draft
router.patch(
  "/:id/publish",
  authenticate,
  authorize("admin"),
  togglePublishCourse,
);

router.patch(
  "/:id/status",
  authenticate,
  authorize("admin"),
  toggleCourseStatus,
);

module.exports = router;