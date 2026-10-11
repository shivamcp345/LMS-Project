const express = require("express");

const {
  enrollInCourse,
  unenrollFromCourse,
  getMyEnrollments,
  getEnrollmentForCourse,
  updateLessonProgress,
  getStudentStats,
  getAdminStats,
} = require("../controllers/enrollment.controller");

const { authenticate, authorize } = require("../middleware/auth.middleware");

const router = express.Router();

// All enrollment routes require a logged-in user
router.use(authenticate);

/*
  STUDENT
*/
router.get("/my", authorize("user"), getMyEnrollments);
router.get("/stats", authorize("user"), getStudentStats);
router.get("/course/:courseId", authorize("user"), getEnrollmentForCourse);

router.post("/", authorize("user"), enrollInCourse);
router.patch("/course/:courseId/progress", authorize("user"), updateLessonProgress);
router.delete("/course/:courseId", authorize("user"), unenrollFromCourse);

/*
  ADMIN
*/
router.get("/admin/stats", authorize("admin"), getAdminStats);

module.exports = router;
