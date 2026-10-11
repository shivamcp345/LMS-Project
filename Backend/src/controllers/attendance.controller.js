const attendanceService = require("../services/attendance.service");

const getAttendance = async (req, res) => {
  try {
    const records = await attendanceService.getAttendance(
      req.user.userId,
      req.params.id,
      req.query.date,
    );

    return res.status(200).json({ success: true, data: records });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const saveAttendance = async (req, res) => {
  try {
    const records = await attendanceService.saveAttendance(
      req.user.userId,
      req.params.id,
      req.body.date,
      req.body.records,
    );

    return res.status(200).json({
      success: true,
      message: "Attendance saved successfully",
      data: records,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const getStudentAttendance = async (req, res) => {
  try {
    const records = await attendanceService.getStudentAttendance(
      req.user.userId,
      req.params.id,
    );

    return res.status(200).json({ success: true, data: records });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const getTrainerStudentAttendance = async (req, res) => {
  try {
    const result = await attendanceService.getTrainerStudentAttendance(
      req.user,
      req.params.id,
      req.params.studentId,
    );
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const saveTrainerStudentAttendance = async (req, res) => {
  try {
    const result = await attendanceService.saveTrainerStudentAttendance(
      req.user,
      req.params.id,
      req.params.studentId,
      req.body.date,
      req.body.status,
    );
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = { getAttendance, getStudentAttendance, saveAttendance, getTrainerStudentAttendance, saveTrainerStudentAttendance };
