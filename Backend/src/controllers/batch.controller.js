const batchService = require("../services/batch.service");
// ADMIN: BATCH CRUD
const getAllBatches = async (req, res) => {
  try {
    const batches = await batchService.getAllBatches();

    return res.status(200).json({
      success: true,
      count: batches.length,
      data: batches,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getBatchById = async (req, res) => {
  try {
    const batch = await batchService.getBatchById(req.params.id);

    return res.status(200).json({
      success: true,
      data: batch,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

const createBatch = async (req, res) => {
  try {
    const { batchName, course, trainer, status, startDate, schedule } = req.body;

    if (!batchName || !course) {
      return res.status(400).json({
        success: false,
        message: "Batch name and linked course are required",
      });
    }

    const batch = await batchService.createBatch({
      batchName: batchName.trim(),
      course: course || null,
      trainer: trainer || null,
      status,
      startDate,
      schedule,
    });

    return res.status(201).json({
      success: true,
      message: "Batch created successfully",
      data: batch,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const toggleBatchStatus = async (req, res) => {
  try {
    const batch = await batchService.toggleBatchStatus(req.params.id);

    return res.status(200).json({
      success: true,
      message: `Batch marked ${batch.status.toLowerCase()}`,
      data: batch,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const updateBatch = async (req, res) => {
  try {
    const batch = await batchService.updateBatch(req.params.id, req.body);

    return res.status(200).json({
      success: true,
      message: "Batch updated successfully",
      data: batch,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteBatch = async (req, res) => {
  try {
    const batch = await batchService.deleteBatch(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Batch deleted successfully",
      data: {
        id: batch._id,
        batchName: batch.batchName,
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
// ADMIN: STUDENT <-> BATCH MAPPING
const getBatchStudents = async (req, res) => {
  try {
    const students =
      req.user.role === "trainer"
        ? await batchService.getTrainerBatchStudents(
            req.user.userId,
            req.params.id,
          )
        : await batchService.getBatchStudents(req.params.id);

    return res.status(200).json({
      success: true,
      count: students.length,
      data: students,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getEligibleBatchStudents = async (req, res) => {
  try {
    const result = await batchService.getEligibleBatchStudents(req.params.id, {
      page: req.query.page,
      search: req.query.search,
    });

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const addStudentToBatch = async (req, res) => {
  try {
    const { studentId } = req.body;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "Student id is required",
      });
    }

    await batchService.addStudentToBatch(req.params.id, studentId);

    const students = await batchService.getBatchStudents(req.params.id);

    return res.status(201).json({
      success: true,
      message: "Student added to batch",
      data: students,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const removeStudentFromBatch = async (req, res) => {
  try {
    await batchService.removeStudentFromBatch(
      req.params.id,
      req.params.studentId,
    );

    const students = await batchService.getBatchStudents(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Student removed from batch",
      data: students,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
// STUDENT: MY BATCHES
const getMyBatches = async (req, res) => {
  try {
    const batches = await batchService.getMyBatches(req.user.userId);

    return res.status(200).json({
      success: true,
      count: batches.length,
      data: batches,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getBatchmates = async (req, res) => {
  try {
    const batchmates = await batchService.getBatchmates(
      req.user.userId,
      req.params.id,
    );

    return res.status(200).json({
      success: true,
      count: batchmates.length,
      data: batchmates,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const getTrainerBatches = async (req, res) => {
  try {
    const batches = await batchService.getTrainerBatches(req.user.userId);

    return res.status(200).json({
      success: true,
      count: batches.length,
      data: batches,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getTrainerStudents = async (req, res) => {
  try {
    const students = await batchService.getTrainerStudents(req.user.userId);

    return res.status(200).json({
      success: true,
      count: students.length,
      data: students,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getTrainerBatchDetails = async (req, res) => {
  try {
    const details = await batchService.getTrainerBatchDetails(req.user.userId, req.params.id);
    return res.status(200).json({ success: true, data: details });
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
  }
};

const updateTrainerMeetingLink = async (req, res) => {
  try {
    const { slotId, meetLink } = req.body;
    if (!slotId || typeof meetLink !== "string") {
      return res.status(400).json({
        success: false,
        message: "Schedule slot and meeting link are required",
      });
    }
    const slot = await batchService.updateTrainerMeetingLink(
      req.user.userId,
      req.params.id,
      slotId,
      meetLink,
    );
    return res.status(200).json({
      success: true,
      message: meetLink.trim() ? "Meeting link saved" : "Meeting link removed",
      data: slot,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const getTrainerStudentDetails = async (req, res) => {
  try {
    const details = await batchService.getTrainerStudentDetails(
      req.user.userId, req.params.id, req.params.studentId,
    );
    return res.status(200).json({ success: true, data: details });
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
  }
};

const getAdminStudentReport = async (req, res) => {
  try {
    const report = await batchService.getAdminStudentReport(req.params.studentId);
    return res.status(200).json({ success: true, data: report });
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
  }
};

module.exports = {
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
  getBatchmates,
  getTrainerBatches,
  getTrainerStudents,
  getTrainerBatchDetails,
  updateTrainerMeetingLink,
  getTrainerStudentDetails,
  getAdminStudentReport,
};
