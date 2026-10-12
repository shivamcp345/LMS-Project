const express = require("express");

const {
  getAllBatches,
  getBatchById,
  createBatch,
  updateBatch,
  deleteBatch,
  toggleBatchStatus,
  getBatchStudents,
  getEligibleBatchStudents,
  addStudentToBatch,
  removeStudentFromBatch,
  getMyBatches,
  askBatchQuestion,
  getBatchmates,
  getTrainerBatches,
  getTrainerStudents,
  getTrainerBatchDetails,
  updateTrainerMeetingLink,
  getTrainerStudentDetails,
  getAdminStudentReport,
} = require("../controllers/batch.controller");
const {
  getStudentAttendance,
  getTrainerStudentAttendance,
  saveTrainerStudentAttendance,
} = require("../controllers/attendance.controller");

const { authenticate, authorize } = require("../middleware/auth.middleware");
const rateLimit = require("../middleware/rateLimit.middleware");

const router = express.Router();

// All batch routes require a logged-in user
router.use(authenticate);

/*
  STUDENT
*/
router.get("/my", getMyBatches);
router.post(
  "/:id/assistant",
  authorize("user"),
  rateLimit({ windowMs: 60_000, max: 10, message: "Please wait before asking more questions." }),
  askBatchQuestion,
);
router.get("/:id/batchmates", getBatchmates);
router.get("/trainer/my", authorize("trainer"), getTrainerBatches);
router.get("/trainer/students", authorize("trainer"), getTrainerStudents);
router.get("/trainer/:id/details", authorize("trainer"), getTrainerBatchDetails);
router.patch("/trainer/:id/schedule-link", authorize("trainer"), updateTrainerMeetingLink);
router.get("/trainer/:id/students/:studentId", authorize("trainer"), getTrainerStudentDetails);
router.get("/admin/students/:studentId/report", authorize("admin"), getAdminStudentReport);
router.get("/:id/students/:studentId/attendance", authorize("trainer", "admin"), getTrainerStudentAttendance);
router.put("/:id/students/:studentId/attendance", authorize("trainer", "admin"), saveTrainerStudentAttendance);
router.get("/:id/attendance/me", authorize("user"), getStudentAttendance);

/*
  ADMIN
*/
router.get("/", authorize("admin"), getAllBatches);
router.get("/:id", authorize("admin"), getBatchById);
router.post("/", authorize("admin"), createBatch);
router.put("/:id", authorize("admin"), updateBatch);
router.delete("/:id", authorize("admin"), deleteBatch);
router.patch("/:id/status", authorize("admin"), toggleBatchStatus);

router.get("/:id/students", authorize("admin", "trainer"), getBatchStudents);
router.get("/:id/eligible-students", authorize("admin"), getEligibleBatchStudents);
router.post("/:id/students", authorize("admin"), addStudentToBatch);
router.delete(
  "/:id/students/:studentId",
  authorize("admin"),
  removeStudentFromBatch,
);

module.exports = router;
