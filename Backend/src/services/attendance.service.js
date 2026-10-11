const Attendance = require("../models/Attendance");
const Batch = require("../models/Batch");
const BatchStudent = require("../models/BatchStudent");
const batchService = require("./batch.service");

function validateDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) {
    throw new Error("A valid attendance date is required");
  }
}

async function getTrainerBatch(batchId, trainerId) {
  const batch = await Batch.findOne({ _id: batchId, trainer: trainerId });

  if (!batch) {
    throw new Error("You are not assigned to this batch");
  }

  return batch;
}

async function getStudentBatch(batchId, studentId) {
  const isMember = await BatchStudent.findOne({
    batch: batchId,
    student: studentId,
  });

  if (!isMember) {
    throw new Error("You are not enrolled in this batch");
  }
  return isMember;
}

const getAttendance = async (trainerId, batchId, date) => {
  validateDate(date);
  await getTrainerBatch(batchId, trainerId);

  return Attendance.find({ batch: batchId, date })
    .select("student status date")
    .lean();
};

const getStudentAttendance = async (studentId, batchId) => {
  const membership = await getStudentBatch(batchId, studentId);
  const batch = await Batch.findById(batchId).select("startDate schedule");
  const records = await Attendance.find({ batch: batchId, student: studentId })
    .select("date status")
    .sort({ date: -1 })
    .lean();
  const byDate = new Map(records.map((record) => [record.date, record]));
  const first = new Date(Math.max(new Date(membership.createdAt).setUTCHours(0, 0, 0, 0), new Date(batch.startDate).setUTCHours(0, 0, 0, 0)));
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const classDays = new Set((batch.schedule || []).map((slot) => slot.dayOfWeek));
  if (classDays.size) {
    for (const day = new Date(first); day <= today; day.setUTCDate(day.getUTCDate() + 1)) {
      const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day.getUTCDay()];
      if (!classDays.has(weekday)) continue;
      const date = day.toISOString().slice(0, 10);
      if (!byDate.has(date)) byDate.set(date, { date, status: "absent" });
    }
  }
  return [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date));
};

const getTrainerStudentAttendance = async (actor, batchId, studentId) => {
  if (actor.role === "trainer") await getTrainerBatch(batchId, actor.userId);
  else if (actor.role !== "admin") throw new Error("You are not allowed to view this attendance");
  const member = await BatchStudent.findOne({ batch: batchId, student: studentId });
  if (!member) throw new Error("Student is not enrolled in this batch");
  const records = await getStudentAttendance(studentId, batchId);
  return { joinedAt: member.createdAt, records };
};

const saveTrainerStudentAttendance = async (actor, batchId, studentId, date, status) => {
  validateDate(date);
  if (actor.role === "trainer") await getTrainerBatch(batchId, actor.userId);
  else if (actor.role !== "admin") throw new Error("You are not allowed to mark attendance");
  const member = await BatchStudent.findOne({ batch: batchId, student: studentId });
  if (!member) throw new Error("Student is not enrolled in this batch");
  const allowed = ["present", "absent", "online", "late", "approvedLeave", "paused", "holiday", "noClass"];
  if (!allowed.includes(status)) throw new Error("Choose a valid attendance status");
  const batch = await Batch.findById(batchId).select("startDate schedule");
  const day = new Date(`${date}T00:00:00.000Z`);
  const today = new Date();
  today.setUTCHours(23, 59, 59, 999);
  if (day > today) throw new Error("Future attendance cannot be marked");
  const dayKey = date;
  const joinedKey = new Date(member.createdAt).toISOString().slice(0, 10);
  const startKey = new Date(batch.startDate).toISOString().slice(0, 10);
  if (dayKey < joinedKey || dayKey < startKey) throw new Error("Attendance cannot be marked before the student joined this batch");
  const weekDay = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day.getUTCDay()];
  const scheduled = !batch.schedule?.length || batch.schedule.some((slot) => slot.dayOfWeek === weekDay);
  if (!scheduled && !["holiday", "noClass"].includes(status)) throw new Error("This date is not a scheduled class day");
  await Attendance.findOneAndUpdate(
    { batch: batchId, student: studentId, date },
    { $set: { status } },
    { upsert: true, new: true, runValidators: true },
  );
  return getTrainerStudentAttendance(actor, batchId, studentId);
};

const saveAttendance = async (trainerId, batchId, date, records) => {
  validateDate(date);

  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("Attendance records are required");
  }

  await getTrainerBatch(batchId, trainerId);
  const students = await batchService.getTrainerBatchStudents(trainerId, batchId);
  const studentIds = new Set(students.map((student) => student._id.toString()));
  const seenStudentIds = new Set();

  const operations = records.map((record) => {
    const studentId = String(record.studentId || "");

    const student = students.find((item) => item._id.toString() === studentId);
    if (!studentIds.has(studentId)) {
      throw new Error("Attendance can only be marked for students in this batch");
    }
    if (student.joinedAt && new Date(`${date}T00:00:00.000Z`) < new Date(student.joinedAt)) {
      throw new Error("Attendance cannot be recorded before a student joined this batch");
    }

    if (seenStudentIds.has(studentId)) {
      throw new Error("Duplicate student attendance record");
    }

    if (!["present", "absent", "online"].includes(record.status)) {
      throw new Error("Attendance status must be present, absent or online");
    }

    seenStudentIds.add(studentId);
    return {
      updateOne: {
        filter: { batch: batchId, student: studentId, date },
        update: { $set: { status: record.status } },
        upsert: true,
      },
    };
  });

  await Attendance.bulkWrite(operations);
  return getAttendance(trainerId, batchId, date);
};

module.exports = { getAttendance, getStudentAttendance, saveAttendance, getTrainerStudentAttendance, saveTrainerStudentAttendance };
