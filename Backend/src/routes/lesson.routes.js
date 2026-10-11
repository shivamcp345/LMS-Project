const express = require("express");

const {
  createLesson,
  getLessonsByBatch,
  getLessonById,
  updateLesson,
  deleteLesson,
  getBatchProgress,
  toggleLessonProgress,
} = require("../controllers/lesson.controller");

const { authenticate, authorize } = require("../middleware/auth.middleware");

const router = express.Router();

/*
  USER + ADMIN (view)
*/

// Lessons for a batch, ordered
router.get("/batch/:batchId", authenticate, getLessonsByBatch);

// Student progress for a batch
router.get("/batch/:batchId/progress", authenticate, authorize("user"), getBatchProgress);

// Single lesson
router.get("/:id", authenticate, getLessonById);

/*
  ADMIN
*/

// Create
router.post("/", authenticate, authorize("admin", "trainer"), createLesson);

// Update
router.put("/:id", authenticate, authorize("admin", "trainer"), updateLesson);

// Delete
router.delete("/:id", authenticate, authorize("admin", "trainer"), deleteLesson);

router.patch("/:id/progress", authenticate, authorize("user"), toggleLessonProgress);

module.exports = router;
