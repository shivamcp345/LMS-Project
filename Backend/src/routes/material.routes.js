const express = require("express");
const { getLessonsByBatch } = require("../controllers/lesson.controller");
const { authenticate } = require("../middleware/auth.middleware");

const router = express.Router();
router.get("/batch/:batchId", authenticate, getLessonsByBatch);

module.exports = router;
