const Batch = require("../models/Batch");
const BatchStudent = require("../models/BatchStudent");
const User = require("../models/User");
const Enrollment = require("../models/Enrollment");
const Course = require("../models/Course");
// HELPERS
// Convert "HH:mm" to minutes since midnight for easy comparison
function toMinutes(time) {
  const [h, m] = String(time || "0:0")
    .split(":")
    .map((n) => parseInt(n, 10) || 0);

  return h * 60 + m;
}

function slotsOverlap(a, b) {
  if (a.dayOfWeek !== b.dayOfWeek) return false;

  const aStart = toMinutes(a.startTime);
  const aEnd = toMinutes(a.endTime);
  const bStart = toMinutes(b.startTime);
  const bEnd = toMinutes(b.endTime);

  return aStart < bEnd && bStart < aEnd;
}

// Checks whether assigning `newSchedule` to a student already mapped to
// other batches would create a day/time clash with any of those batches.
// Returns the conflicting batch if found, otherwise null.
const findScheduleConflict = async (studentId, newSchedule, excludeBatchId) => {
  const mappings = await BatchStudent.find({ student: studentId }).populate(
    "batch",
  );

  for (const mapping of mappings) {
    const otherBatch = mapping.batch;

    if (!otherBatch || otherBatch.isDeleted) continue;
    if (excludeBatchId && otherBatch._id.toString() === excludeBatchId.toString()) {
      continue;
    }

    for (const existingSlot of otherBatch.schedule || []) {
      for (const slot of newSchedule || []) {
        if (slotsOverlap(existingSlot, slot)) {
          return { batch: otherBatch, slot: existingSlot };
        }
      }
    }
  }

  return null;
};
// ADMIN: BATCH CRUD
const validateTrainer = async (trainerId) => {
  if (!trainerId) return;

  const trainer = await User.findOne({ _id: trainerId, role: "trainer" });

  if (!trainer) {
    throw new Error("Assigned trainer not found");
  }
};

const findActiveCourse = async (courseId, { allowInactive = false } = {}) => {
  if (!courseId) {
    throw new Error("A course must be linked before creating a batch");
  }

  const course = await Course.findOne({
    _id: courseId,
    isDeleted: { $ne: true },
  });

  if (!course) {
    throw new Error("Linked course not found");
  }

  if (!allowInactive && course.isActive === false) {
    throw new Error("Select an active course before creating a batch");
  }

  return course;
};

const calculateEndDate = (startDate, duration) => {
  const match = String(duration || "")
    .trim()
    .match(/^(\d+(?:\.\d+)?)\s*(days?|weeks?|months?|years?|hours?)$/i);

  if (!match) {
    throw new Error(
      "The linked course needs a duration in days, weeks, months, years or hours",
    );
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const endDate = new Date(startDate);

  if (unit.startsWith("hour")) {
    endDate.setUTCHours(endDate.getUTCHours() + amount);
  } else if (unit.startsWith("day")) {
    endDate.setUTCDate(endDate.getUTCDate() + amount);
  } else if (unit.startsWith("week")) {
    endDate.setUTCDate(endDate.getUTCDate() + amount * 7);
  } else {
    const months = amount * (unit.startsWith("year") ? 12 : 1);
    const wholeMonths = Math.trunc(months);
    const day = endDate.getUTCDate();
    endDate.setUTCDate(1);
    endDate.setUTCMonth(endDate.getUTCMonth() + wholeMonths);
    endDate.setUTCDate(
      Math.min(
        day,
        new Date(
          Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth() + 1, 0),
        ).getUTCDate(),
      ),
    );
    const remainingDays = (months - wholeMonths) * 30;
    endDate.setUTCDate(endDate.getUTCDate() + remainingDays);
  }

  return endDate;
};

const getAllBatches = async () => {
  const batches = await Batch.find({ isDeleted: { $ne: true } })
    .populate("course", "title category")
    .populate("trainer", "name email")
    .sort({ createdAt: -1 })
    .lean();

  return Promise.all(
    batches.map(async (batch) => ({
      ...batch,
      studentCount: (await getBatchStudents(batch._id)).length,
    })),
  );
};

const getBatchById = async (batchId) => {
  const batch = await Batch.findOne({
    _id: batchId,
    isDeleted: { $ne: true },
  }).populate(
    "course",
    "title category",
  ).populate("trainer", "name email");

  if (!batch) {
    throw new Error("Batch not found");
  }

  return batch;
};

const validateSchedule = (schedule = []) => {
  if (!Array.isArray(schedule)) {
    throw new Error("Batch schedule must be an array");
  }

  for (const slot of schedule) {
    if (!slot?.dayOfWeek || !slot?.startTime || !slot?.endTime) {
      throw new Error("Every schedule slot needs a day, start time and end time");
    }

    const toMinutes = (value) => {
      const [hours, minutes] = String(value).split(":").map(Number);
      return hours * 60 + minutes;
    };

    if (
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.startTime) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.endTime)
    ) {
      throw new Error("Schedule times must use HH:mm format");
    }

    if (toMinutes(slot.endTime) <= toMinutes(slot.startTime)) {
      throw new Error("Schedule end time must be after start time");
    }
  }

  for (let i = 0; i < schedule.length; i += 1) {
    for (let j = i + 1; j < schedule.length; j += 1) {
      if (slotsOverlap(schedule[i], schedule[j])) {
        throw new Error(
          `Schedule slots overlap on ${schedule[i].dayOfWeek}`,
        );
      }
    }
  }
};

const createBatch = async (batchData) => {
  const course = await findActiveCourse(batchData.course);
  await validateTrainer(batchData.trainer);
  const startDate = batchData.startDate ? new Date(batchData.startDate) : new Date();
  validateSchedule(batchData.schedule || []);

  if (Number.isNaN(startDate.getTime())) {
    throw new Error("A valid start date is required");
  }

  return await Batch.create({
    ...batchData,
    startDate,
    endDate: calculateEndDate(startDate, course.duration),
    schedule: batchData.schedule || [],
  });
};

const updateBatch = async (batchId, batchData) => {
  const batch = await Batch.findOne({
    _id: batchId,
    isDeleted: { $ne: true },
  });

  if (!batch) {
    throw new Error("Batch not found");
  }

  if (batchData.trainer !== undefined) {
    await validateTrainer(batchData.trainer);
  }

  if (
    batchData.course !== undefined ||
    batchData.startDate !== undefined ||
    batchData.endDate !== undefined
  ) {
    const course = await findActiveCourse(batchData.course ?? batch.course, {
      allowInactive: true,
    });
    const startDate = new Date(batchData.startDate ?? batch.startDate);

    if (Number.isNaN(startDate.getTime())) {
      throw new Error("A valid start date is required");
    }

    batchData = {
      ...batchData,
      course: batchData.course ?? batch.course,
      startDate,
      endDate: calculateEndDate(startDate, course.duration),
    };
  }

  if (Array.isArray(batchData.schedule)) {
    validateSchedule(batchData.schedule);
    const rosterStudentIds = (
      await BatchStudent.find({ batch: batchId }).select("student")
    ).map((m) => m.student);

    for (const studentId of rosterStudentIds) {
      const conflict = await findScheduleConflict(
        studentId,
        batchData.schedule,
        batchId,
      );

      if (conflict) {
        throw new Error(
          `Cannot update timings: a student in this batch is also in "${conflict.batch.batchName}" ` +
            `on ${conflict.slot.dayOfWeek} ${conflict.slot.startTime}-${conflict.slot.endTime}`,
        );
      }
    }
  }

  Object.assign(batch, batchData);

  await batch.save();
  await batch.populate([
    { path: "course", select: "title category" },
    { path: "trainer", select: "name email" },
  ]);

  return batch;
};

const deleteBatch = async (batchId) => {
  const batch = await Batch.findOne({
    _id: batchId,
    isDeleted: { $ne: true },
  });

  if (!batch) {
    throw new Error("Batch not found");
  }

  batch.isDeleted = true;
  await batch.save();

  return batch;
};

const toggleBatchStatus = async (batchId) => {
  const batch = await Batch.findOne({
    _id: batchId,
    isDeleted: { $ne: true },
  });

  if (!batch) {
    throw new Error("Batch not found");
  }

  batch.status = batch.status === "Inactive" ? "Active" : "Inactive";
  await batch.save();
  return batch;
};
// ADMIN: STUDENT <-> BATCH MAPPING
const getBatchStudents = async (batchId) => {
  const mappings = await BatchStudent.find({ batch: batchId })
    .populate("student", "name email mobile address profilePicture role")
    .sort({ createdAt: 1 });

  return mappings
    .filter((m) => m.student)
    .map((m) => ({
      mappingId: m._id,
      joinedAt: m.createdAt,
      ...m.student.toObject(),
    }));

};

const getEligibleBatchStudents = async (batchId, { page = 1, search = "" } = {}) => {
  const batch = await Batch.findOne({
    _id: batchId,
    isDeleted: { $ne: true },
  }).select("course");

  if (!batch?.course) {
    throw new Error("This batch does not have a linked course");
  }

  const enrolledIds = await Enrollment.find({ course: batch.course }).distinct(
    "student",
  );
  const mappedIds = await BatchStudent.find({ batch: batchId }).distinct(
    "student",
  );
  const excludedIds = new Set(mappedIds.map((id) => id.toString()));
  const candidates = enrolledIds.filter((id) => !excludedIds.has(id.toString()));
  const query = {
    _id: { $in: candidates },
    role: "user",
    isActive: { $ne: false },
  };
  const normalizedSearch = String(search).trim();

  if (normalizedSearch) {
    const escapedSearch = normalizedSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$or = [
      { name: { $regex: escapedSearch, $options: "i" } },
      { email: { $regex: escapedSearch, $options: "i" } },
    ];
  }

  const limit = 5;
  const [students, total] = await Promise.all([
    User.find(query)
      .select("name email mobile")
      .sort({ name: 1 })
      .skip((Math.max(1, Number(page) || 1) - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(query),
  ]);

  return { students, total, page: Math.max(1, Number(page) || 1), limit };
};

const addStudentToBatch = async (batchId, studentId) => {
  const batch = await Batch.findOne({
    _id: batchId,
    isDeleted: { $ne: true },
  });

  if (!batch) {
    throw new Error("Batch not found");
  }

  const student = await User.findById(studentId);

  if (!student) {
    throw new Error("Student not found");
  }

  if (student.role !== "user" || !student.isActive) {
    throw new Error("Only active students can be added to a batch");
  }

  const enrollment = await Enrollment.findOne({
    student: studentId,
    course: batch.course,
  });

  if (!enrollment) {
    throw new Error("Student is not enrolled in this batch's course");
  }

  const existingMapping = await BatchStudent.findOne({
    batch: batchId,
    student: studentId,
  });

  if (existingMapping) {
    throw new Error("Student is already in this batch");
  }

  const conflict = await findScheduleConflict(
    studentId,
    batch.schedule,
    batchId,
  );

  if (conflict) {
    throw new Error(
      `Schedule conflict: this student is already in "${conflict.batch.batchName}" ` +
        `on ${conflict.slot.dayOfWeek} ${conflict.slot.startTime}-${conflict.slot.endTime}`,
    );
  }

  return await BatchStudent.create({ batch: batchId, student: studentId });
};

const removeStudentFromBatch = async (batchId, studentId) => {
  const mapping = await BatchStudent.findOneAndDelete({
    batch: batchId,
    student: studentId,
  });

  if (!mapping) {
    throw new Error("Student is not in this batch");
  }

  return mapping;
};
// STUDENT: MY BATCHES
const getMyBatches = async (studentId) => {
  const mappings = await BatchStudent.find({ student: studentId }).populate({
    path: "batch",
    populate: { path: "course", select: "title category description" },
  });

  const batches = mappings
    .filter((m) => m.batch && !m.batch.isDeleted)
    .map((m) => ({ batch: m.batch, joinedAt: m.createdAt }));

  const withCounts = await Promise.all(
    batches.map(async ({ batch, joinedAt }) => {
      const studentCount = (await getBatchStudents(batch._id)).length;

      return {
        ...batch.toObject(),
        joinedAt,
        studentCount,
      };
    }),
  );

  return withCounts;
};

const getStudentBatchQuestionContext = async (batchId, studentId) => {
  const isMember = await BatchStudent.exists({ batch: batchId, student: studentId });
  if (!isMember) throw new Error("Batch not found");

  const batch = await Batch.findOne({
    _id: batchId,
    isDeleted: { $ne: true },
  })
    .populate("course", "title description category level curriculum")
    .lean();

  if (!batch) throw new Error("Batch not found");

  const course = batch.course || {};
  return {
    batchName: batch.batchName,
    courseTitle: course.title || "Course",
    courseDescription: String(course.description || "").slice(0, 3000),
    category: course.category,
    level: course.level,
    curriculum: (course.curriculum || [])
      .map((item) => String(item.title || "").slice(0, 160))
      .filter(Boolean)
      .slice(0, 40),
  };
};

const getBatchmates = async (studentId, batchId) => {
  const batch = await Batch.findOne({
    _id: batchId,
    isDeleted: { $ne: true },
  });

  if (!batch) {
    throw new Error("Batch not found");
  }

  const isMember = await BatchStudent.findOne({
    student: studentId,
    batch: batchId,
  });

  if (!isMember) {
    throw new Error("You are not a member of this batch");
  }

  const mappings = await BatchStudent.find({ batch: batchId }).populate(
    "student",
    "name email profilePicture",
  );

  return mappings
    .filter((m) => m.student && m.student._id.toString() !== studentId.toString())
    .map((m) => m.student);
};
// TRAINER: ASSIGNED BATCHES
const getTrainerBatches = async (trainerId) => {
  const batches = await Batch.find({ trainer: trainerId })
    .where({ isDeleted: { $ne: true } })
    .populate("course", "title category description")
    .populate("trainer", "name email")
    .sort({ startDate: 1 })
    .lean();

  return Promise.all(
    batches.map(async (batch) => ({
      ...batch,
      studentCount: (await getBatchStudents(batch._id)).length,
    })),
  );
};

const getTrainerBatchStudents = async (trainerId, batchId) => {
  const batch = await Batch.findOne({
    _id: batchId,
    trainer: trainerId,
    isDeleted: { $ne: true },
  });

  if (!batch) {
    throw new Error("You are not assigned to this batch");
  }

  const mappings = await BatchStudent.find({ batch: batchId })
    .populate("student", "name email mobile address profilePicture profileDetails isActive")
    .sort({ createdAt: 1 });
  return mappings.filter((mapping) => mapping.student).map((mapping) => ({
    mappingId: mapping._id,
    joinedAt: mapping.createdAt,
    ...mapping.student.toObject(),
  }));
};

const getTrainerBatchDetails = async (trainerId, batchId) => {
  const batch = await Batch.findOne({
    _id: batchId,
    trainer: trainerId,
    isDeleted: { $ne: true },
  })
    .populate("course", "title category description")
    .populate("trainer", "name email")
    .lean();

  if (!batch) throw new Error("You are not assigned to this batch");

  const students = await getTrainerBatchStudents(trainerId, batchId);
  return { batch, students };
};

const updateTrainerMeetingLink = async (trainerId, batchId, slotId, meetLink) => {
  const batch = await Batch.findOne({
    _id: batchId,
    trainer: trainerId,
    isDeleted: { $ne: true },
  });
  if (!batch) throw new Error("Assigned batch not found");

  const slot = batch.schedule.id(slotId);
  if (!slot) throw new Error("Schedule slot not found");

  const cleanedLink = String(meetLink || "").trim();
  if (cleanedLink.length > 2048) {
    throw new Error("Meeting link cannot exceed 2048 characters");
  }
  if (cleanedLink) {
    let parsedLink;
    try {
      parsedLink = new URL(cleanedLink);
    } catch {
      throw new Error("Enter a valid HTTPS meeting link");
    }
    if (parsedLink.protocol !== "https:") {
      throw new Error("Meeting links must use HTTPS");
    }
  }

  slot.meetLink = cleanedLink;
  await batch.save();
  return slot;
};

const getTrainerStudentDetails = async (trainerId, batchId, studentId) => {
  const details = await getTrainerBatchDetails(trainerId, batchId);
  const student = details.students.find((item) => item._id.toString() === studentId.toString());
  if (!student) throw new Error("Student is not enrolled in this batch");
  const attendanceService = require("./attendance.service");
  const attendance = await attendanceService.getTrainerStudentAttendance(
    { role: "trainer", userId: trainerId }, batchId, studentId,
  );
  return { batch: details.batch, student, attendance };
};

const getAdminStudentReport = async (studentId) => {
  const memberships = await BatchStudent.find({ student: studentId })
    .populate({
      path: "batch",
      select: "batchName status startDate endDate schedule trainer course",
      populate: [
        { path: "course", select: "title category" },
        { path: "trainer", select: "name email" },
      ],
    })
    .sort({ createdAt: -1 })
    .lean();
  const attendanceService = require("./attendance.service");
  const batches = await Promise.all(
    memberships.filter((item) => item.batch).map(async (item) => ({
      batch: item.batch,
      joinedAt: item.createdAt,
      attendance: await attendanceService.getStudentAttendance(studentId, item.batch._id),
    })),
  );
  return { batches };
};

const getTrainerStudents = async (trainerId) => {
  const batches = await Batch.find({ trainer: trainerId })
    .where({ isDeleted: { $ne: true } })
    .select("batchName")
    .lean();
  const rosters = await Promise.all(
    batches.map(async (batch) => {
      const students = await getBatchStudents(batch._id);

      return students.map((student) => ({
        ...student,
        batch: {
          id: batch._id,
          name: batch.batchName,
        },
      }));
    }),
  );
  const students = new Map();

  for (const student of rosters.flat()) {
    const studentId = student._id.toString();
    const current = students.get(studentId);

    if (current) {
      current.batches.push(student.batch);
      continue;
    }

    students.set(studentId, {
      ...student,
      batches: [student.batch],
    });
  }

  return Array.from(students.values());
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
  getStudentBatchQuestionContext,
  getBatchmates,
  getTrainerBatches,
  getTrainerBatchStudents,
  getTrainerBatchDetails,
  updateTrainerMeetingLink,
  getTrainerStudentDetails,
  getAdminStudentReport,
  getTrainerStudents,
};
